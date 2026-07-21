# セットアップガイド - 議事録自動生成システム

このガイドでは、**完全無料の音声認識**を使用するシステムをセットアップします。

---

## 前提条件

- Node.js 18.0.0 以上
- Python 3.9 以上（Whisper実行に必須）
- 4GB 以上のRAM
- インターネット接続（初回セットアップ時のみ）

---

## ステップ 1: Whisper のインストール

### macOS / Linux

```bash
# Python が無い場合はインストール
brew install python3

# Whisper をインストール
pip install openai-whisper

# インストール確認
whisper --version
```

### Windows

```bash
# Python 3.9+ をインストール（https://python.org から）
# ※ インストール時に「Add Python to PATH」にチェック

# Whisper をインストール
pip install openai-whisper

# インストール確認
whisper --version
```

### Docker でインストール

```bash
# すべての依存関係が含まれた Docker イメージを使用
docker pull openai/whisper

# またはカスタム Dockerfile を使用
# docker-compose.yml に記載
```

---

## ステップ 2: プロジェクトセットアップ

### 2.1 リポジトリ取得

```bash
cd /Users/kazutakehonda/Claude\ Project/meeting-summary
```

### 2.2 環境変数設定

```bash
# .env ファイルを作成
cp .env.example .env

# .env を編集（Anthropic API キーのみ必要）
```

**.env ファイルの内容:**

```env
# Anthropic API Key (必須)
ANTHROPIC_API_KEY=sk-ant-xxxxxxxxxxxxxxxxxxxxx

# Whisper Model (オプション、デフォルト: base)
# tiny: 最速（精度は低め）
# base: バランス型（推奨）
# small: 高精度（時間がかかる）
# medium: さらに高精度
# large: 最高精度（最も時間がかかる）
WHISPER_MODEL=base

# Server Port (オプション、デフォルト: 3000)
PORT=3000

# Environment
NODE_ENV=development
```

### 2.3 Node.js 依存関係インストール

```bash
npm install
```

### 2.4 Whisper モデルダウンロード

**重要**: 初回起動時に Whisper モデルをダウンロードします。

```bash
# base モデルをダウンロード（約140MB）
whisper --model base --device cpu --output_format json input_sample.mp3 --output_dir ./temp

# または Python で直接ダウンロード
python -c "import whisper; whisper.load_model('base')"
```

> **モデルサイズの目安:**
> - tiny: ~40MB, 高速
> - base: ~140MB, バランス型（推奨）
> - small: ~460MB, 高精度
> - medium: ~1.5GB, 非常に高精度
> - large: ~2.9GB, 最高精度

---

## ステップ 3: サーバー起動

### 開発環境

```bash
npm run dev
```

### 本番環境

```bash
npm start
```

### Docker

```bash
docker-compose up -d
```

---

## ステップ 4: 動作確認

### ブラウザでアクセス

```
http://localhost:3000
```

### テスト用の音声ファイルをアップロード

1. input/ フォルダの音声ファイルを使用
2. ブラウザから upload
3. 処理が完了するまで待機

---

## 初回セットアップ時の処理時間

| ステップ | 時間 | 備考 |
|---------|------|------|
| Whisper インストール | 5-10分 | pip install |
| モデルダウンロード | 5-30分 | ネット速度次第 |
| npm install | 2-5分 | パッケージ依存 |
| 初回音声認識 | 5-15分 | モデルロード時間 |
| **合計** | **17-60分** | |

**2回目以降:**
- 30秒～2分（ファイルの長さに応じて）

---

## パフォーマンス最適化

### GPU 対応（高速化）

NVIDIA GPU がある場合、処理速度が 5-10 倍高速化します。

```bash
# CUDA をインストール
# https://developer.nvidia.com/cuda-downloads

# GPU 対応の Whisper をインストール
pip install openai-whisper torch torchaudio --index-url https://download.pytorch.org/whl/cu118

# サーバー起動時に GPU を自動利用
npm start
```

### メモリ最適化

メモリが限定されている場合：

```env
# base モデルを tiny に変更
WHISPER_MODEL=tiny

# または small で中程度のバランス
WHISPER_MODEL=small
```

---

## トラブルシューティング

### ❌ 「whisper: command not found」

**原因**: Whisper がインストールされていない

**解決策**:
```bash
pip install openai-whisper
which whisper  # パスを確認
```

### ❌ 「モデルファイルが見つかりません」

**原因**: Whisper モデルがダウンロードされていない

**解決策**:
```bash
# モデルを事前ダウンロード
python -c "import whisper; whisper.load_model('base')"

# または手動でダウンロード
mkdir -p ~/.cache/whisper
cd ~/.cache/whisper
# https://openaipublic.blob.core.windows.net/main/whisper/models/base.pt をダウンロード
```

### ❌ 「メモリ不足エラー」

**原因**: 大きなモデル（medium/large）を使用している

**解決策**:
```env
# .env で tiny または base に変更
WHISPER_MODEL=base
```

### ❌ 「音声認識が遅い」

**原因**: CPU のみで処理している

**解決策**:
- GPU を導入（NVIDIA GPU + CUDA）
- または小さいモデルに変更

### ❌ 「Anthropic API エラー」

**原因**: API キーが無効

**確認**:
```bash
# .env ファイルを確認
cat .env | grep ANTHROPIC_API_KEY

# API キーの有効性を確認
# https://console.anthropic.com/
```

---

## API キー取得方法

### Anthropic API キー取得

1. https://console.anthropic.com/ にアクセス
2. 「API Keys」セクションへ移動
3. 「+ Create Key」をクリック
4. キーをコピーして `.env` に貼り付け

---

## ファイアウォール・プロキシ設定

企業ネットワークの場合：

```bash
# npm プロキシ設定
npm config set proxy http://proxy.example.com:8080
npm config set https-proxy http://proxy.example.com:8080

# Python プロキシ設定
pip install --proxy [user:passwd@]proxy.server:port openai-whisper
```

---

## Docker でのセットアップ

Docker を使用する場合、すべての依存関係が自動インストールされます：

```bash
# docker-compose.yml を編集（必要に応じて）
docker-compose build
docker-compose up -d

# ログ確認
docker-compose logs -f

# 停止
docker-compose down
```

---

## クラウドデプロイ

### Heroku

```bash
# Heroku CLI をインストール
brew tap heroku/brew && brew install heroku

# ログイン
heroku login

# アプリケーションを作成
heroku create your-app-name

# 環境変数を設定
heroku config:set ANTHROPIC_API_KEY=sk-ant-xxxxx

# デプロイ
git push heroku main

# ログ確認
heroku logs -t
```

### Railway

```bash
# Railway CLI をインストール
npm i -g @railway/cli

# ログイン
railway login

# 接続
railway link

# デプロイ
railway up

# 環境変数を設定
railway variables
```

### 注意: Whisper のインストール

クラウドデプロイ時は、`Dockerfile` に以下を追加：

```dockerfile
RUN apt-get update && apt-get install -y python3 python3-pip && \
    pip install openai-whisper
```

---

## 定期メンテナンス

### Whisper モデルの更新

```bash
# 最新版に更新
pip install --upgrade openai-whisper
```

### npm パッケージの更新

```bash
# 依存関係をアップデート
npm update

# または
npm outdated
npm install
```

---

## 次のステップ

セットアップ完了後：

1. ✅ `npm start` でサーバー起動
2. ✅ ブラウザで http://localhost:3000 にアクセス
3. ✅ 音声ファイルをアップロード
4. ✅ 議事録が自動生成されることを確認

---

## 詳細情報

- **README.md** - 使用方法
- **IMPLEMENTATION_PLAN.md** - アーキテクチャ詳細
- **Whisper 公式ドキュメント** - https://github.com/openai/whisper

---

**完全無料のシステムで、チームの業務効率化をお進めください！**
