# 議事録自動生成システム

iPhone で録音した音声ファイルから定型の議事録を自動生成するシステムです。

## 概要

このシステムは、以下の流れで議事録を自動生成します：

1. **音声アップロード** - Web UIからiPhone録音のmp3/m4aファイルをアップロード
2. **音声認識** - ローカル Whisper で音声をテキスト化（完全無料）
3. **議事録生成** - IBM Service Essentials APIでガイドラインに従った議事録を自動生成
4. **ファイル出力** - Markdown / Word (docx) / PDF形式で出力

## 必要な環境

- Node.js 18以上
- Python 3.9以上（ローカル Whisper 音声認識用）
- IBM Service Essentials API キー（議事録生成用）
- ※ OpenAI API キーは不要（完全無料の Whisper を使用）
- ※ Anthropic API キーは不要（IBM Service を使用）

## インストール

### 1. Whisper をインストール（無料の音声認識）

**macOS / Linux:**
```bash
pip install openai-whisper
```

**Windows:**
```bash
# Python 3.9+ をインストール（https://python.org）
# その後、Whisper をインストール
pip install openai-whisper
```

### 2. リポジトリのセットアップ

```bash
cd meeting-summary
cp .env.example .env
```

### 3. 環境変数の設定

`.env` ファイルを編集して、**IBM Service Essentials API キー**を設定：

```env
IBM_API_KEY=your-ibm-api-key-here
IBM_SERVICE_ID=consulting-advantage
WHISPER_MODEL=base
PORT=3000
```

### 4. 依存関係のインストール

```bash
npm install
```

**詳細なセットアップは [SETUP_GUIDE.md](SETUP_GUIDE.md) を参照ください。**

## 使用方法

### ローカルでの起動

```bash
# 本番環境
npm start

# 開発環境（自動リロード対応）
npm run dev
```

ブラウザで `http://localhost:3000` にアクセスしてください。

### Dockerでの起動

```bash
docker-compose up -d
```

## API仕様

### POST /api/process

音声ファイルをアップロードして議事録を生成します。

**リクエスト:**
```
Content-Type: multipart/form-data

- file: 音声ファイル (mp3, m4a, wav, flac) - 最大100MB
- format: 出力形式 (markdown, docx, pdf) - デフォルト: markdown
```

**レスポンス:**
```json
{
  "success": true,
  "content": "# 議事録\n\n## ■開催日時\n...",
  "filename": "20260721_議事録_143022.md",
  "format": "markdown"
}
```

### GET /download/:filename

生成された議事録ファイルをダウンロードします。

## 議事録のガイドライン

議事録は `input/Rule for meeting summary.txt` で定義されたガイドラインに従って自動生成されます。

主な構成：
- **開催日時** - YYYY年MM月DD日（曜日） HH:MM～HH:MM
- **参加者** - 日本側、北米側、IBM側に分類
- **議題** - 通常4項目
- **決定事項** - アジェンダごとに整理
- **宿題事項** - テーブル形式で「No.、内容、担当者、期限」を記載
- **議事内容** - アジェンダごとの詳細要約
- **補足事項** - 会議の雰囲気、技術的補足など

## ファイル構成

```
meeting-summary/
├── index.html              # フロントエンド UI
├── server.js               # バックエンド API
├── package.json            # npm dependencies
├── .env.example            # 環境変数テンプレート
├── Dockerfile              # Docker イメージ定義
├── docker-compose.yml      # Docker Compose 設定
├── input/
│   └── Rule for meeting summary.txt  # 議事録ガイドライン
├── uploads/                # 一時アップロードディレクトリ
└── output/                 # 生成された議事録ファイル
```

## デプロイ

### Vercel へのデプロイ

1. Vercel アカウントを作成
2. リポジトリを接続
3. 環境変数を設定（OPENAI_API_KEY, ANTHROPIC_API_KEY）
4. デプロイ

### Railway へのデプロイ

1. Railway アカウントを作成
2. 新規プロジェクトを作成
3. リポジトリを接続
4. 環境変数を設定
5. デプロイ

### Google Cloud Run へのデプロイ

```bash
# イメージをビルド
docker build -t gcr.io/PROJECT_ID/meeting-summary .

# Artifact Registry にプッシュ
docker push gcr.io/PROJECT_ID/meeting-summary

# Cloud Run にデプロイ
gcloud run deploy meeting-summary \
  --image gcr.io/PROJECT_ID/meeting-summary \
  --platform managed \
  --region us-central1 \
  --set-env-vars OPENAI_API_KEY=xxx,ANTHROPIC_API_KEY=xxx
```

## トラブルシューティング

### 音声認識に失敗する場合

- Whisper がインストールされているか確認（`whisper --version`）
- ファイル形式が対応しているか確認（mp3, m4a, wav, flac）
- ファイルサイズが100MB以下か確認
- メモリが不足していないか確認（`free -h`）
- 詳細は [SETUP_GUIDE.md](SETUP_GUIDE.md) の「トラブルシューティング」を参照

### 議事録生成に失敗する場合

- Anthropic API キーが正しく設定されているか確認
- トークン使用量が上限に達していないか確認
- ネットワーク接続を確認

### ファイルダウンロードに失敗する場合

- ブラウザのダウンロード設定を確認
- ポップアップブロッカーが有効になっていないか確認
- ファイルシステムの権限を確認

## セキュリティに関する注意

- `.env` ファイルを Git にコミットしないでください
- Anthropic API キーを誰とも共有しないでください
- 本番環境では HTTPS を必ず使用してください
- ファイルアップロード機能は認証を追加することを推奨します

## コスト比較

| 方法 | 音声認識 | テキスト生成 | 月額 |
|------|--------|----------|------|
| **このシステム（無料版）** | Whisper（無料） | Claude | ~$15 |
| 従来型（有料版） | Whisper API | Claude | ~$70 |
| **節約額** | **$50/月** | | **削減** |

## 今後の改善予定

- [ ] ユーザー認証とアクセス制御
- [ ] ファイル履歴と管理機能
- [ ] 議事録のテンプレートカスタマイズ
- [ ] 複数言語対応
- [ ] バッチ処理機能
- [ ] Slack / Microsoft Teams 連携
- [ ] 字幕ファイル（VTT）の自動生成

## ライセンス

MIT License

## サポート

質問や問題がある場合は、GitHub Issues で報告してください。
