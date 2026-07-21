# コスト最適化 - 完全無料の音声認識実装

**更新日**: 2026年7月21日  
**変更内容**: OpenAI Whisper API（有料）→ ローカル Whisper（無料）への切り替え

---

## 📊 コスト削減効果

| 項目 | 従来型 | 最適化版 | 削減 |
|------|--------|--------|------|
| **OpenAI Whisper** | $0.006/分 × 100h = $36 | $0 | **$36/月** |
| **Claude API** | ~$15 | ~$15 | $0 |
| **クラウド運用** | $20-50 | $20-50 | $0 |
| **合計/月** | **$71-101** | **$35-65** | **$36-50/月削減** |
| **年間削減** | | | **$432-600** |

---

## ✨ 実装の変更点

### 1. 音声認識方式の変更

**従来型（有料）:**
```
iPhone音声 → Web UI → OpenAI Whisper API → トランスクリプト
```

**最適化版（無料）:**
```
iPhone音声 → Web UI → ローカル Whisper → トランスクリプト
```

### 2. 技術的な変更

**削除されたもの:**
- ✗ axios （HTTP通信ライブラリ）
- ✗ form-data （マルチパート処理）
- ✗ OPENAI_API_KEY 環境変数

**追加されたもの:**
- ✓ spawn （子プロセス管理）
- ✓ Whisper CLI 実行エンジン
- ✓ WHISPER_MODEL 環境変数（モデルサイズ選択）

### 3. 処理フロー

**server.js の transcribeAudio 関数:**

```javascript
// 従来型（APIに送信）
const response = await axios.post(
    'https://api.openai.com/v1/audio/transcriptions',
    formData,
    { headers: { Authorization: `Bearer ${OPENAI_API_KEY}` } }
);

// 最適化版（ローカル実行）
const whisper = spawn('whisper', [
    filePath,
    '--model', process.env.WHISPER_MODEL || 'base',
    '--language', 'ja',
    '--output_format', 'json'
]);
```

---

## 🔧 セットアップ変更

### 環境変数

**従来型:**
```env
OPENAI_API_KEY=sk-xxxxx
ANTHROPIC_API_KEY=sk-ant-xxxxx
```

**最適化版:**
```env
# OPENAI_API_KEY は不要
ANTHROPIC_API_KEY=sk-ant-xxxxx
WHISPER_MODEL=base  # 追加
```

### 依存関係

**package.json から削除:**
- axios
- form-data

**Python に追加:**
```bash
pip install openai-whisper
```

---

## 📈 パフォーマンス比較

### 処理速度

| モデル | ファイル時間 | 処理時間 | 速度 |
|-------|-----------|--------|------|
| tiny | 30分 | 2-3分 | 10-15倍 |
| base | 30分 | 5-8分 | 4-6倍 |
| small | 30分 | 10-15分 | 2-3倍 |
| medium | 30分 | 20-30分 | 1-1.5倍 |
| large | 30分 | 40-50分 | 0.6-0.75倍 |

**GPU 搭載時:**
- 速度 5-10 倍高速化

### 精度

| モデル | 日本語精度 | 推奨用途 |
|-------|---------|---------|
| tiny | 70% | 高速プレビュー |
| **base** | **85-90%** | **バランス型（推奨）** |
| small | 92-95% | 高精度が必要な場合 |
| medium | 95-97% | 複雑な用語を含む場合 |
| large | 97-99% | 最高精度が必須の場合 |

> base モデルは「バランス型」として、精度と速度の最適な組み合わせです。

---

## 💾 ストレージ要件

### Whisper モデルサイズ

```
tiny:   ~40MB
base:   ~140MB   ← 推奨
small:  ~460MB
medium: ~1.5GB
large:  ~2.9GB
```

### 初回セットアップ

| ステップ | 容量 | 時間 |
|---------|------|------|
| Whisper インストール | - | 5分 |
| base モデル DL | 140MB | 5-30分 |
| npm 依存関係 | 200MB | 2-5分 |
| 合計 | ~340MB | 12-40分 |

---

## 🚀 デプロイ方法

### Docker での利点（推奨）

```dockerfile
FROM node:18

# Whisper + FFmpeg をインストール
RUN apt-get install -y python3-pip ffmpeg && \
    pip install openai-whisper

# Whisper モデルを事前ダウンロード
RUN python3 -c "import whisper; whisper.load_model('base')"

# Node.js アプリケーション
COPY . .
RUN npm install
CMD ["npm", "start"]
```

**利点:**
- ✓ 全依存関係が含まれる
- ✓ どの環境でも一貫性がある
- ✓ 外部 API キー不要

### クラウドランタイム

| プラットフォーム | 対応 | 備考 |
|-----------|------|------|
| Vercel | ✓ | Serverless（注意: Whisper インストール時間） |
| Railway | ✓ | 推奨 |
| Heroku | ✓ | buildpack 必須 |
| Google Cloud Run | ✓ | コンテナ最大 50 分 |
| AWS Lambda | ✗ | 実行時間制限（15分）では不可 |

> Vercel/Railway での Whisper インストールは初回実行時に時間がかかります

---

## 🔐 セキュリティと プライバシー

### 従来型の懸念点
- ✗ 音声ファイルを OpenAI に送信
- ✗ API キーが必要
- ✗ ネットワーク依存

### 最適化版の利点
- ✓ すべてのデータがローカルで処理
- ✓ 音声ファイルが外部に出ない
- ✓ API キーは Claude のみ必要
- ✓ オフライン処理可能（初回以外）

---

## 📋 マイグレーション チェックリスト

既存システムからの移行：

- [ ] Whisper をインストール（Python 3.9+）
- [ ] package.json から axios/form-data を削除
- [ ] .env から OPENAI_API_KEY を削除
- [ ] .env に WHISPER_MODEL を追加
- [ ] server.js の transcribeAudio 関数を更新
- [ ] テスト実行（最初の音声ファイルでテスト）
- [ ] Dockerfile を更新（Whisper RUN コマンド追加）
- [ ] クラウドデプロイ設定を更新

---

## ⚠️ 注意事項と制限

### メモリ要件

| モデル | 最小メモリ | 推奨メモリ |
|-------|-----------|----------|
| tiny | 512MB | 1GB |
| base | 1GB | 2GB |
| small | 2GB | 4GB |
| medium | 5GB | 8GB |
| large | 10GB | 16GB |

> サーバー側で base モデルを使用する場合、最小 1GB のメモリが必要です

### 処理時間がかかる場合

**原因と対策:**

1. **CPU が低い**
   - → 小さいモデルに変更（tiny → base）
   - → GPU を追加（NVIDIA）

2. **メモリが不足**
   - → base モデルを使用（medium/large ではない）
   - → サーバーのメモリを増やす

3. **ディスク I/O が遅い**
   - → SSD の使用確認
   - → ファイルシステムをチェック

### オフラインでの利用

初回セットアップ後：
- ✓ Whisper は完全オフライン処理
- ✗ Claude API は常時接続が必要

---

## 🎯 最適なモデル選択

### small 30分の会議の場合

**初回セットアップ時:**
```bash
# base をダウンロード（140MB）
python -c "import whisper; whisper.load_model('base')"
```

**処理時間:**
```
base モデル: 5-8分
GPU 搭載時: 1-2分
```

**推奨設定:**
```env
WHISPER_MODEL=base
```

### 複数言語の対応が必要な場合

```env
# small モデルなら複数言語の精度が向上
WHISPER_MODEL=small
```

### 最高精度が必須の場合

```env
# large モデル（最高精度）
WHISPER_MODEL=large
```

---

## 💡 今後の最適化方針

### Phase 1: 現在（実装完了）
- ✅ ローカル Whisper 統合
- ✅ モデルサイズ選択可能
- ✅ 完全無料化

### Phase 2: 3ヶ月以内
- [ ] GPU 自動検出と最適化
- [ ] キャッシング機構（同じ音声ファイルの重複処理回避）
- [ ] 非同期バッチ処理

### Phase 3: 6ヶ月以内
- [ ] 複数言語対応
- [ ] 音声品質自動判定
- [ ] 処理時間の自動推定

### Phase 4: 12ヶ月以内
- [ ] 新しい Whisper モデルへの自動更新
- [ ] マルチモデル並列処理
- [ ] エッジデバイス対応

---

## 📞 サポート

### よくある質問

**Q. base と tiny どちらを選ぶべき？**  
A. ほとんどの場合 base がおすすめです。tiny は高速ですが精度が低いです。

**Q. GPU がない場合？**  
A. CPU のみでも動作しますが、処理時間がかかります。base モデルをお勧めします。

**Q. 既存システムの移行は難しい？**  
A. いいえ。server.js の関数を1つ置き換えるだけで完了です。

---

## 参考資料

- [OpenAI Whisper GitHub](https://github.com/openai/whisper)
- [Whisper 公式ドキュメント](https://github.com/openai/whisper/blob/main/README.md)
- [faster-whisper（高速版）](https://github.com/guillaumekln/faster-whisper)

---

## まとめ

**このコスト最適化により:**

✅ 月額 $36 の削減  
✅ プライバシーの保護  
✅ オフライン対応  
✅ 制限なしの利用  

**年間で最大 $600 の節約が実現できました！**

---

**実装日**: 2026年7月21日  
**バージョン**: 1.1.0（コスト最適化版）
