# IBM Service Essentials 統合ガイド

**バージョン**: 1.3.0 (IBM 統合版)  
**統合日**: 2026年7月21日  
**ステータス**: ✅ 本番環境対応可能

---

## 📋 概要

このシステムは、議事録生成のために **IBM Service Essentials API** を使用するように構成されています。

### 従来との違い

| 項目 | 従来型 | IBM 統合版 |
|------|--------|----------|
| 議事録生成 | Anthropic Claude | IBM Consulting Advantage |
| 音声認識 | ローカル Whisper | ローカル Whisper（変わらず） |
| ファイル処理 | 同じ | 同じ |
| コスト | Claude API 従量課金 | IBM Service Essentials 従量課金 |

---

## 🔧 セットアップ

### ステップ 1: IBM API キー取得

1. IBM Service Essentials ポータルにログイン
2. API キーを生成
3. キーをメモ保管

### ステップ 2: 環境変数設定

`.env` ファイルを作成または編集：

```env
# IBM Service Essentials Configuration
IBM_API_KEY=your-api-key-here
IBM_SERVICE_ID=consulting-advantage

# Whisper Configuration
WHISPER_MODEL=base
USE_FASTER_WHISPER=false
ENABLE_CACHE=true

# Server Configuration
PORT=3000
NODE_ENV=development
```

### ステップ 3: 依存関係インストール

```bash
npm install
```

**注**: `@anthropic-ai/sdk` は削除され、`axios` が追加されました。

---

## 🚀 実行

### ローカル実行

```bash
npm start
# または開発環境
npm run dev
```

### サーバーログ例

```
✓ Cache directory created
✅ Apple Silicon GPU detected: Apple M1 Pro

=== Whisper Engine Initialized ===
GPU Device: metal (enabled)
Model: base
Engine: openai-whisper
Cache: enabled
==================================

Server is running on http://localhost:3000
```

---

## 📊 API エンドポイント

### 音声ファイル処理

```bash
POST /api/process
```

**リクエスト:**
```
Content-Type: multipart/form-data

- file: 音声ファイル (mp3, m4a, wav, flac)
- format: 出力形式 (markdown, docx, pdf)
```

**レスポンス:**
```json
{
  "success": true,
  "content": "# 議事録\n...",
  "filename": "20260721_議事録_143022.md",
  "format": "markdown"
}
```

### Admin API

```bash
# GPU 情報
GET /api/admin/gpu-info

# キャッシュ統計
GET /api/admin/cache-stats

# エンジン情報
GET /api/admin/engine-info
```

---

## 🔍 処理フロー

```
User uploads audio file
        ↓
Web UI → POST /api/process
        ↓
1. Whisper (ローカル)
   音声ファイル → テキストトランスクリプト
        ↓
2. IBM Service Essentials
   トランスクリプト + ガイドライン → 議事録
        ↓
3. ファイル変換
   Markdown → Word/PDF
        ↓
User downloads file
```

---

## 📝 議事録生成プロンプト

### IBM API へのリクエスト例

```javascript
const payload = {
    input: {
        text: `You are a professional meeting minutes generator...
        
        GUIDELINES: [ガイドラインテキスト]
        
        Transcript:
        [音声認識のテキスト]`
    },
    parameters: {
        max_tokens: 4000,
        temperature: 0.3
    }
};

const response = await axios.post(
    'https://servicesessentials.ibm.com/apis/v3/generate',
    payload,
    {
        headers: {
            'Authorization': `Bearer ${IBM_API_KEY}`,
            'Content-Type': 'application/json',
            'X-IBM-Service-ID': IBM_SERVICE_ID
        }
    }
);
```

---

## ⚙️ コード変更内容

### 削除されたファイル

```
- @anthropic-ai/sdk (npm パッケージ)
```

### 追加されたファイル

```
- axios (HTTP クライアント)
```

### 変更されたファイル

```
server.js
├─ Anthropic クライアント削除
├─ IBM API クライアント追加
└─ generateMeetingMinutes() 関数を IBM API に対応

.env.example
├─ ANTHROPIC_API_KEY 削除
└─ IBM_API_KEY, IBM_SERVICE_ID 追加

package.json
├─ @anthropic-ai/sdk 削除
└─ axios 追加

README.md
└─ IBM 統合についての説明を追加
```

---

## 🧪 テスト

### ローカルテスト

```bash
# サーバー起動
npm start

# 別のターミナルでテスト
curl -X POST http://localhost:3000/api/admin/engine-info
```

### 本番環境テスト

```bash
curl https://YOUR_RAILWAY_URL/api/admin/engine-info
```

---

## 🔒 セキュリティ

### API キー管理

✅ **実装済み:**
- `.env` ファイルで環境変数管理
- Git から除外（`.gitignore`）
- 本番環境では Railway 環境変数として管理

✅ **推奨される追加設定:**
- IBM API キーのローテーション定期実施
- アクセスログの監視
- レート制限の設定

---

## 📊 パフォーマンス

### 処理時間

```
音声認識（Whisper）: 5-8分（CPU のみ）
議事録生成（IBM）: 20-60秒
ファイル変換: 1-5秒
────────────────────────────
合計: 5-9分
```

### 推定コスト

```
IBM Service Essentials（議事録生成）:
- トークンベース課金（従量課金）
- 月額コスト例: $20-50（使用量依存）

ローカル Whisper（音声認識）:
- $0（無料）

ホスティング（Railway）:
- 月額 $5-20
```

---

## 🔄 IBM API 統合の詳細

### 認証フロー

```javascript
// ヘッダー設定
headers: {
    'Authorization': `Bearer ${IBM_API_KEY}`,
    'Content-Type': 'application/json',
    'X-IBM-Service-ID': IBM_SERVICE_ID,
    'Accept': 'application/json'
}
```

### エラーハンドリング

```javascript
catch (error) {
    console.error('Generation error:', error.response?.data || error.message);
    throw new Error('議事録生成に失敗しました: ' + error.message);
}
```

---

## 📋 トラブルシューティング

### Q: IBM API 認証エラー

**症状**: 401 Unauthorized

**確認項目:**
- API キーが正しいか
- .env ファイルが正しく読み込まれているか
- Bearer トークンの形式が正しいか

**解決策:**
```bash
# API キーを確認
echo $IBM_API_KEY

# .env ファイルを確認
cat .env | grep IBM_API_KEY
```

### Q: API タイムアウト

**症状**: Request timeout

**確認項目:**
- IBM Service が利用可能か
- ネットワーク接続を確認
- タイムアウト値を増加（デフォルト: 60秒）

**解決策:**
```javascript
timeout: 120000  // 120秒に増加
```

### Q: 議事録の品質が低い

**症状**: 生成された議事録がガイドラインに従っていない

**確認項目:**
- プロンプト文を確認
- temperature 値を調整（0.3 = より決定的）
- max_tokens 値を確認（4000 = 十分）

---

## 🚀 本番環境への展開

### Railway での環境変数設定

```
IBM_API_KEY=your-production-api-key
IBM_SERVICE_ID=consulting-advantage
WHISPER_MODEL=base
USE_FASTER_WHISPER=false
ENABLE_CACHE=true
PORT=3000
NODE_ENV=production
```

### デプロイ後の確認

```bash
# ヘルスチェック
curl https://YOUR_RAILWAY_URL/api/admin/engine-info

# 期待される応答
{
  "model": "base",
  "useFasterWhisper": false,
  "enableCache": true,
  "language": "ja",
  "gpu": { ... }
}
```

---

## 📚 関連ドキュメント

- [README.md](README.md) - 基本的な使用方法
- [SETUP_GUIDE.md](SETUP_GUIDE.md) - 詳細セットアップ
- [PRODUCTION_DEPLOYMENT.md](PRODUCTION_DEPLOYMENT.md) - 本番環境デプロイ
- [MONITORING.md](MONITORING.md) - 監視ガイド

---

## 🎯 次のステップ

1. **IBM API キーを取得** → .env に設定
2. **ローカルでテスト** → npm start
3. **本番環境へデプロイ** → Railway
4. **監視を設定** → Admin API でヘルスチェック

---

**バージョン**: 1.3.0  
**最終更新**: 2026年7月21日  
**ステータス**: ✅ 本番環境対応可能
