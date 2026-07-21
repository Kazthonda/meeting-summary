# 議事録自動生成システム - 実装計画

## プロジェクト概要

チームのAI活用による業務効率化施策として、**iPhoneで録音した音声ファイルを定型の議事録フォーマットに自動変換するシステム**を開発します。

---

## 1. 方式設計

### 1.1 全体アーキテクチャ

```
┌─────────────────────────────────────────────────┐
│ クライアント (Web UI)                             │
│ - HTML/CSS/JavaScript                            │
│ - ドラッグ&ドロップ対応のファイルアップロード      │
│ - 出力形式選択UI                                 │
└────────────────┬────────────────────────────────┘
                 │ HTTP/HTTPS
                 ▼
┌─────────────────────────────────────────────────┐
│ バックエンド (Node.js + Express)                 │
│ ├─ ファイル保存 (multer)                         │
│ ├─ 音声認識 (OpenAI Whisper API)               │
│ ├─ 議事録生成 (Claude API)                       │
│ └─ ファイル変換 (PDF/DOCX)                       │
└────────────────┬────────────────────────────────┘
                 │
         ┌───────┴────────────┐
         │                    │
         ▼                    ▼
    OpenAI API          Anthropic API
    (Whisper)           (Claude 3.5)
```

### 1.2 処理フロー

```
User: iPhone音声ファイル
   │
   ▼
[1] Web UI: ファイル選択/ドラッグ&ドロップ
   │
   ▼
[2] API: /api/process (POST)
   ├─ ファイル受け取り
   ├─ 形式検証 (mp3, m4a, wav, flac)
   └─ 一時保存
   │
   ▼
[3] Whisper API: 音声認識
   ├─ 音声ファイル → テキスト
   ├─ 言語: 日本語
   └─ トランスクリプト出力
   │
   ▼
[4] Claude API: 議事録生成
   ├─ ガイドライン適用
   ├─ 参加者/議題/決定事項抽出
   ├─ 宿題事項テーブル生成
   └─ Markdown形式出力
   │
   ▼
[5] ファイル変換
   ├─ Markdown出力
   ├─ DOCX変換 (Markdown → Word)
   └─ PDF変換 (Markdown → PDF)
   │
   ▼
[6] UI: ダウンロード
   └─ ユーザーが指定形式でダウンロード
```

### 1.3 利用するAPI・ライブラリ

| 項目 | 選定技術 | 理由 |
|------|--------|------|
| **フロントエンド** | Vanilla JS (HTML/CSS) | シンプル、追加インストール不要 |
| **バックエンド** | Node.js + Express | 軽量、スケーラブル、簡単デプロイ |
| **音声認識** | OpenAI Whisper API | 日本語対応、高精度、リアルタイム |
| **テキスト生成** | Anthropic Claude 3.5 | 日本語対応、ガイドライン解釈能力、長文対応 |
| **ファイル保存** | multer | Node.js標準のファイル処理 |
| **PDF生成** | pdfkit | 純JavaScript、デプロイ簡単 |
| **DOCX生成** | mammoth | Markdown → DOCX変換 |
| **デプロイ** | Docker + クラウド | スケーラブル、環境統一 |

---

## 2. 実装プラン

### 2.1 ファイル構成

```
meeting-summary/
├── index.html                    # フロントエンド UI
├── server.js                     # バックエンド API (Express)
├── package.json                  # npm dependencies
├── .env.example                  # 環境変数テンプレート
├── Dockerfile                    # Docker イメージ定義
├── docker-compose.yml            # Docker Compose 設定
├── README.md                     # 使用方法
├── IMPLEMENTATION_PLAN.md        # このファイル
├── input/
│   └── Rule for meeting summary.txt  # 議事録ガイドライン
├── uploads/                      # 一時アップロードディレクトリ
└── output/                       # 生成議事録ファイル
```

### 2.2 実装ステップ

#### Phase 1: UI実装（完了）
- [x] HTML/CSS デザイン
- [x] ファイルアップロード UI
- [x] ドラッグ&ドロップ機能
- [x] 出力形式選択UI
- [x] プログレスバー表示
- [x] ダウンロードボタン

#### Phase 2: バックエンド基盤（完了）
- [x] Express サーバー初期化
- [x] multer ファイルアップロード設定
- [x] エラーハンドリング
- [x] CORS設定

#### Phase 3: API連携（完了）
- [x] Whisper API 音声認識統合
- [x] Claude API 議事録生成統合
- [x] トランスクリプション処理フロー
- [x] 議事録生成プロンプト最適化

#### Phase 4: ファイル出力（完了）
- [x] Markdown ファイル生成
- [x] PDF 変換処理
- [x] DOCX 変換処理
- [x] ファイルダウンロード実装

#### Phase 5: デプロイ対応（完了）
- [x] Docker化
- [x] docker-compose.yml
- [x] 環境変数管理
- [x] ドキュメント整備

### 2.3 実装の重要ポイント

#### ガイドライン対応

```javascript
// server.js内の MEETING_SUMMARY_PROMPT で
ガイドラインテキストを Claude に提供

MEETING_SUMMARY_PROMPT = `
You are a professional meeting minutes generator...

GUIDELINES:
${GUIDELINES}  // ← input/Rule for meeting summary.txt の内容

Your job is to:
1. Extract participants (Japan/North America/IBM)
2. Extract agenda items
3. Extract decision items organized by agenda
4. Extract action items with owners/deadlines
5. Summarize meeting content
6. Add supplementary notes
`;
```

#### 音声認識の最適化

```javascript
// Whisper API 呼び出し時の設定
const formData = new FormData();
formData.append('file', fileStream);
formData.append('model', 'whisper-1');
formData.append('language', 'ja');  // 日本語を明示指定
```

#### 出力ファイル命名

```javascript
// ファイル名規則: YYYYMMDD_議事録_HHmmss.{拡張子}
function generateFilename(format) {
    const now = new Date();
    const date = now.toISOString().split('T')[0].replace(/-/g, '');
    const time = now.toTimeString().split(' ')[0].replace(/:/g, '');
    const ext = format === 'md' ? 'md' : (format === 'docx' ? 'docx' : 'pdf');
    return `${date}_議事録_${time}.${ext}`;
}
// 例: 20260721_議事録_143022.md
```

---

## 3. 実装詳細

### 3.1 フロントエンド (index.html)

**主要機能:**

```javascript
// ファイル選択と検証
function handleFileSelect(file) {
    // ファイル形式チェック
    const validTypes = ['audio/mpeg', 'audio/mp4', 'audio/wav', 'audio/flac'];
    
    // ファイルサイズチェック (最大100MB)
    if (file.size > 100 * 1024 * 1024) {
        showStatus('ファイルサイズが大きすぎます', 'error');
        return;
    }
    
    selectedFile = file;
    updateUI();
}

// 処理実行
async function processAudio(file, format) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('format', format);
    
    const response = await fetch('/api/process', {
        method: 'POST',
        body: formData
    });
    
    const result = await response.json();
    generatedContent = result.content;
    showDownloadOptions(result.filename);
}
```

### 3.2 バックエンド (server.js)

**主要エンドポイント:**

```javascript
// POST /api/process
// 1. ファイル受け取り
// 2. Whisper API で音声認識
// 3. Claude API で議事録生成
// 4. ファイル形式に変換
// 5. ダウンロード用ファイル作成

async function processAudio(file, format) {
    // Step 1: 音声認識
    const transcript = await transcribeAudio(filePath);
    
    // Step 2: 議事録生成
    const meetingMinutes = await generateMeetingMinutes(transcript);
    
    // Step 3: ファイル変換
    switch (format) {
        case 'docx':
            await markdownToDocx(meetingMinutes, outputPath);
            break;
        case 'pdf':
            await markdownToPdf(meetingMinutes, outputPath);
            break;
        default:
            fs.writeFileSync(outputPath, meetingMinutes);
    }
    
    return outputPath;
}

// GET /download/:filename
// ダウンロード提供 → ファイル削除
```

### 3.3 ガイドライン組み込み

**server.js での実装:**

```javascript
// ガイドライン読み込み
const GUIDELINES = fs.readFileSync(
    path.join(__dirname, 'input/Rule for meeting summary.txt'),
    'utf-8'
);

// Claude に対する指示に組み込み
const MEETING_SUMMARY_PROMPT = `
You are a professional meeting minutes generator...

GUIDELINES:
${GUIDELINES}

Your job is to:
1. Identify all participants and classify them
2. Extract the agenda items
3. Extract decision items organized by agenda
4. Extract action items with owners and deadlines
5. Summarize the meeting content
...
`;
```

---

## 4. セットアップ手順

### 4.1 ローカル環境でのセットアップ

```bash
# 1. リポジトリクローン
git clone <repository-url>
cd meeting-summary

# 2. 環境変数設定
cp .env.example .env
# .env ファイルを編集して API キーを設定

# 3. 依存関係インストール
npm install

# 4. 起動
npm start
# ブラウザで http://localhost:3000 にアクセス
```

### 4.2 Docker での起動

```bash
# 1. イメージのビルドと起動
docker-compose up -d

# 2. ログ確認
docker-compose logs -f app

# 3. アクセス
# ブラウザで http://localhost:3000 にアクセス
```

### 4.3 環境変数の設定

```bash
# .env ファイルを作成
OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxx    # OpenAI API キー
ANTHROPIC_API_KEY=sk-ant-xxxxxxxxxxxxxxxxxxxxx  # Anthropic API キー
PORT=3000  # サーバーポート
```

---

## 5. クラウドデプロイ

### 5.1 Vercel へのデプロイ

```bash
# 1. Vercel CLI インストール
npm i -g vercel

# 2. デプロイ
vercel

# 3. 環境変数設定
# Vercel ダッシュボードで OPENAI_API_KEY と ANTHROPIC_API_KEY を設定
```

### 5.2 Railway へのデプロイ

```bash
# 1. Railway アカウント作成
# 2. 新規プロジェクト作成
# 3. GitHub リポジトリ接続
# 4. 環境変数設定
```

### 5.3 Google Cloud Run へのデプロイ

```bash
# 1. イメージビルド
docker build -t gcr.io/PROJECT_ID/meeting-summary .

# 2. プッシュ
docker push gcr.io/PROJECT_ID/meeting-summary

# 3. デプロイ
gcloud run deploy meeting-summary \
  --image gcr.io/PROJECT_ID/meeting-summary \
  --platform managed \
  --region us-central1 \
  --set-env-vars OPENAI_API_KEY=xxx,ANTHROPIC_API_KEY=xxx
```

---

## 6. 今後の拡張予定

### Phase 6: 認証・セキュリティ強化
- [ ] ユーザー認証（OAuth 2.0）
- [ ] APIキー管理
- [ ] レート制限
- [ ] HTTPS強制

### Phase 7: 機能拡張
- [ ] 複数ファイル一括処理
- [ ] 議事録テンプレートカスタマイズ
- [ ] 参加者プロフィール管理
- [ ] 宿題進捗管理機能

### Phase 8: 統合機能
- [ ] Slack 連携
- [ ] Microsoft Teams 連携
- [ ] Google Drive 自動保存
- [ ] Slack 通知機能

### Phase 9: 分析機能
- [ ] 処理時間分析
- [ ] 使用量統計
- [ ] AI コスト分析
- [ ] 品質スコア

---

## 7. トラブルシューティング

### Whisper API エラー
**症状**: 音声認識に失敗
**原因**: API キーエラー、ネットワーク問題
**対処**: 
- API キーを確認
- インターネット接続を確認
- ファイルサイズを確認（最大25MB/Whisper）

### Claude API エラー
**症状**: 議事録生成に失敗
**原因**: API キーエラー、トークン不足
**対処**:
- API キーを確認
- 使用量を確認
- モデル名が正しいか確認

### ファイル変換エラー
**症状**: PDF/DOCX 出力に失敗
**原因**: ライブラリのインストール不足
**対処**:
- `npm install` で依存関係を再インストール
- Node.js バージョンを確認

---

## 8. パフォーマンス最適化

### キャッシング戦略
```javascript
// 同じ音声ファイルの重複処理を避ける
const cache = new Map();
if (cache.has(fileHash)) {
    return cache.get(fileHash);
}
```

### 非同期処理
```javascript
// 複数ファイルの並列処理対応
Promise.all([
    transcribeAudio(file1),
    transcribeAudio(file2),
    transcribeAudio(file3)
])
```

### ファイルクリーンアップ
```javascript
// 定期的に古いファイルを削除
setInterval(() => {
    cleanupOldFiles(outputDir, 24 * 60 * 60 * 1000); // 24時間
}, 60 * 60 * 1000); // 1時間ごと
```

---

## 9. コスト見積もり

| サービス | 料金 | 使用量 | 月額コスト |
|---------|------|--------|----------|
| OpenAI Whisper | $0.006 / 分 | 100時間 | $36 |
| Claude 3.5 Sonnet | $3/M input, $15/M output | 1M tokens | ~$15 |
| **合計** | | | **~$50** |

※ 使用量により変動

---

## 10. セキュリティ考慮事項

- [x] API キーは環境変数で管理（コミット除外）
- [x] ファイルサイズ制限（100MB）
- [x] ファイル形式検証
- [x] アップロード後のクリーンアップ
- [ ] HTTPS 強制（本番環境）
- [ ] ユーザー認証（今後）
- [ ] APIレート制限（今後）

---

## 11. 品質保証

### テストケース

- [x] ファイルアップロード（正常系）
- [x] ファイル形式検証（異常系）
- [x] ファイルサイズ制限（異常系）
- [x] API エラーハンドリング
- [x] ファイルダウンロード

### デバッグモード

```bash
# 詳細ログを有効化
DEBUG=meeting-summary:* npm start
```

---

## 12. ドキュメント

- [x] README.md - 使用方法
- [x] IMPLEMENTATION_PLAN.md - このファイル
- [x] .env.example - 環境変数説明
- [x] API 仕様書（README.md内）

---

## まとめ

このシステムは、**シンプルながら強力な議事録自動生成ツール**として実装されています。

**主な特徴:**
- シンプルで直感的なUI
- クラウドネイティブなアーキテクチャ
- ガイドライン完全対応
- 複数出力形式対応（Markdown/DOCX/PDF）
- スケーラブルなデプロイメント

**次のステップ:**
1. 環境変数を設定（API キー）
2. `npm install` でセットアップ
3. `npm start` で起動
4. ブラウザで `http://localhost:3000` にアクセス
5. 音声ファイルをアップロード

---

**作成日**: 2026年7月21日  
**バージョン**: 1.0.0  
**ステータス**: ✅ 実装完了
