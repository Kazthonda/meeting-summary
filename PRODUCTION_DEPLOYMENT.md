# 本番環境デプロイガイド - Railway

**バージョン**: 1.2.0  
**プラットフォーム**: Railway  
**デプロイ方法**: GitHub 自動連携  

---

## 📋 前提条件

- [ ] GitHub アカウント
- [ ] Railway アカウント（https://railway.app）
- [ ] Anthropic API キー
- [ ] GitHub リポジトリにコミット済み

---

## 🚀 デプロイ手順

### ステップ 1: GitHub にプッシュ

```bash
# リモートリポジトリを追加
git remote add origin https://github.com/YOUR_USERNAME/meeting-summary.git

# ブランチをプッシュ
git branch -M main
git push -u origin main
```

### ステップ 2: Railway での初期設定

1. **Railway にログイン**
   - https://railway.app にアクセス

2. **新規プロジェクトを作成**
   - "New Project" をクリック
   - "GitHub Repo" を選択
   - 認証を許可

3. **リポジトリを選択**
   - `meeting-summary` リポジトリを選択

4. **自動デプロイが開始**
   - Railway が自動的に Dockerfile をビルド
   - コンテナがデプロイされます

### ステップ 3: 環境変数の設定

Railway ダッシュボードで以下の環境変数を設定：

```env
ANTHROPIC_API_KEY=sk-ant-xxxxxxxxxxxxxxxxxxxxx
WHISPER_MODEL=base
USE_FASTER_WHISPER=false
ENABLE_CACHE=true
PORT=3000
NODE_ENV=production
```

**設定方法:**
1. プロジェクト → サービス選択
2. "Variables" タブ
3. 各変数を追加

### ステップ 4: 本番 URL の取得

1. Railway ダッシュボード → Deployments
2. "View Logs" で確認
3. URL が表示される（例: `https://meeting-summary-production.railway.app`）

---

## ✅ デプロイ確認

### ヘルスチェック

```bash
# 基本的な接続確認
curl https://YOUR_RAILWAY_URL/api/admin/gpu-info

# 期待される応答例
{
  "gpuType": "cpu",
  "available": false,
  "device": "cpu",
  "recommendedModel": "tiny"
}
```

### Admin API テスト

```bash
# GPU 情報
curl https://YOUR_RAILWAY_URL/api/admin/gpu-info

# キャッシュ統計
curl https://YOUR_RAILWAY_URL/api/admin/cache-stats

# エンジン情報
curl https://YOUR_RAILWAY_URL/api/admin/engine-info
```

---

## 📊 本番環境の仕様

### Railway リソース

| リソース | 仕様 | 月額コスト |
|---------|------|---------|
| **Compute** | 512MB RAM | $5 |
| **Bandwidth** | 100GB/月 | 含む |
| **Database** | 不要 | - |
| **合計** | | **$5/月～** |

### 推奨設定

```yaml
Memory: 512MB - 1GB（推奨）
CPU: Shared（十分）
Replica: 1（スケーリング可能）
```

---

## 🔧 自動デプロイの仕組み

### GitHub 連携フロー

```
GitHub Push
    ↓
Webhook トリガー
    ↓
Railway がビルド開始
    ↓
Dockerfile 実行
    ├─ Python + Whisper インストール
    ├─ Node.js 依存関係
    ├─ アプリケーションコピー
    └─ コンテナ起動
    ↓
本番 URL で利用可能
```

### 自動デプロイの有効化

**デフォルトで有効**

- main ブランチへの push で自動デプロイ
- CI/CD パイプライン完全自動化

---

## 🔒 セキュリティ設定

### 環境変数の保護

✅ **Railway での管理**
- API キーは暗号化されて保存
- git にコミットされない（.env.example のみ）
- 本番環境でのみ設定

### 推奨される追加設定

```bash
# 1. CORS の有効化（必要に応じて）
ALLOWED_ORIGINS=https://yourdomain.com

# 2. レート制限（future feature）
RATE_LIMIT_REQUESTS=1000
RATE_LIMIT_WINDOW=3600
```

---

## 📈 スケーリング戦略

### 初期段階（$5/月）

```
Single Replica
- 512MB RAM
- 1 CPU Core
- ~100 API requests/day
```

### 成長段階

```
// 必要に応じてスケール
Memory を 1GB に増加
Replica を 2～3 に増加
→ $10-15/月
```

### 大規模運用

```
// Redis キャッシュの追加
// ロードバランサー
// CDN の導入
```

---

## 🛠️ トラブルシューティング

### デプロイが失敗する

**症状**: Docker ビルド失敗

**対策**:
```bash
# ローカルで Dockerfile をテスト
docker build -t meeting-summary .

# エラーメッセージを確認
docker logs <container_id>
```

### Whisper モデルのロードが遅い

**症状**: 初回起動が遅い

**対策**:
- Railway ダッシュボードで "Memory" を 1GB に増加
- タイムアウト設定を確認

### API が 503 エラー

**症状**: サービス利用不可

**対策**:
1. Railway ダッシュボードでリソース確認
2. ログで エラーメッセージ確認
3. 必要に応じてメモリを増加

---

## 📋 本番環境チェックリスト

- [ ] GitHub にコミット完了
- [ ] Railway アカウント作成
- [ ] リポジトリ接続完了
- [ ] 環境変数を設定
- [ ] ビルド・デプロイ成功
- [ ] ヘルスチェック確認
- [ ] Admin API テスト完了
- [ ] CORS 設定（必要に応じて）
- [ ] SSL/HTTPS 確認
- [ ] 本番 URL 記録

---

## 📞 サポート

### Railway サポート

- **ドキュメント**: https://docs.railway.app
- **ステータス**: https://status.railway.app
- **コミュニティ**: Railway Discord

### アプリケーション固有

- **GitHub Issues**: プロジェクトの Issues タブ
- **ドキュメント**: README.md, OPTIMIZATION_GUIDE.md

---

## 💡 ベストプラクティス

### デプロイ前

```bash
# ローカルテスト
npm install
npm start

# Docker でテスト
docker build -t meeting-summary .
docker run -p 3000:3000 meeting-summary
```

### デプロイ後

```bash
# ヘルスチェック定期実行
curl https://YOUR_RAILWAY_URL/api/admin/gpu-info

# ログをモニタリング
# Railway ダッシュボード → Logs
```

### 継続的な改善

- エラーログを定期的に確認
- パフォーマンス指標を監視
- 必要に応じてリソースをスケーリング

---

## 🎯 次のステップ

1. **GitHub リポジトリ作成**
   - https://github.com/new で新規作成

2. **Railway にデプロイ**
   - https://railway.app で接続

3. **本番 URL 取得**
   - チームに共有

4. **ユーザーテスト**
   - 実際のユースケースで検証

5. **フィードバック収集**
   - 改善点を記録

---

**デプロイ完了後、下記のコマンドで確認:**

```bash
# 本番環境への接続確認
curl https://YOUR_RAILWAY_URL

# API エンドポイント確認
curl https://YOUR_RAILWAY_URL/api/admin/engine-info
```

---

**作成日**: 2026年7月21日  
**バージョン**: 1.2.0  
**ステータス**: 🚀 本番環境対応可能
