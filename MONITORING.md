# 本番環境モニタリングガイド

**バージョン**: 1.2.0  
**対象環境**: Railway 本番環境  

---

## 📊 モニタリング項目

### 1. アプリケーションヘルス

#### エンドポイント

```bash
GET /api/admin/engine-info
```

**チェック項目:**
- GPU が利用可能か
- キャッシング機構が動作しているか
- モデルが正しいか

**期待される応答:**
```json
{
  "model": "base",
  "useFasterWhisper": false,
  "enableCache": true,
  "language": "ja",
  "gpu": {
    "gpuType": "cpu",
    "isAvailable": false,
    "device": "cpu",
    "accelerated": false
  }
}
```

### 2. キャッシュ使用率

#### エンドポイント

```bash
GET /api/admin/cache-stats
```

**監視項目:**
- 総キャッシュサイズ
- キャッシュファイル数
- ストレージ効率

**警告閾値:**
- キャッシュサイズ > 500MB → クリーンアップ検討
- キャッシュファイル数 > 1000 → 自動削除確認

### 3. API パフォーマンス

#### メトリクス

```
処理時間:
- 正常時: 5-8分（CPU のみ）
- 異常: > 15分（調査必要）

エラー率:
- 正常: < 0.1%
- 警告: 0.1% - 1%
- 異常: > 1%
```

---

## 🔍 定期チェックリスト

### 日次（毎日）

- [ ] サーバーが起動しているか
- [ ] エラーログを確認
- [ ] API レスポンスが正常か
- [ ] キャッシュサイズを確認

```bash
# スクリプト例
curl -s https://YOUR_RAILWAY_URL/api/admin/engine-info | jq .
curl -s https://YOUR_RAILWAY_URL/api/admin/cache-stats | jq .
```

### 週次

- [ ] パフォーマンストレンドを確認
- [ ] エラーパターンを分析
- [ ] リソース使用率を確認
- [ ] ログファイルをアーカイブ

### 月次

- [ ] 総処理件数をレポート
- [ ] コスト分析
- [ ] スケーリング要否を判断
- [ ] セキュリティアップデート確認

---

## ⚠️ アラート設定

### 重要度 1（直ちに対応）

```
条件: API が 5分以上応答しない
アクション: サービス再起動、ログ確認
```

### 重要度 2（本日中に対応）

```
条件: エラー率が 1% を超える
アクション: ログ分析、根本原因特定
```

### 重要度 3（対応予定）

```
条件: メモリ使用率 > 80%
アクション: 週内にリソース増加検討
```

---

## 📈 パフォーマンス最適化

### ボトルネック特定

**Railway ダッシュボード:**

1. **Metrics** タブで確認
   - CPU 使用率
   - メモリ使用率
   - ネットワーク I/O

2. **Logs** タブで確認
   - エラーメッセージ
   - 処理時間
   - GPU 状態

### 最適化戦略

```
CPU 高い → メモリ増加を検討
メモリ不足 → tiny モデルに変更
I/O 遅い → ファイルシステム確認
```

---

## 🔐 セキュリティモニタリング

### アクセスログ確認

```bash
# Railway ダッシュボール → Logs
# 以下の項目を確認
- 異常なアクセスパターン
- ブルートフォース攻撃
- 不正なリクエスト
```

### 環境変数のセキュリティ

✅ **定期確認事項:**
- API キーが外部に漏洩していないか
- GitHub に .env がコミットされていないか
- Railway の権限設定が適切か

---

## 📋 推奨モニタリングツール

### 1. Railway 内蔵

- **Metrics**: CPU、メモリ、ネットワーク
- **Logs**: リアルタイムログストリーム
- **Deployments**: デプロイ履歴

### 2. 外部ツール（オプション）

```
- Uptime Robot（アップタイム監視）
- DataDog（高度なメトリクス）
- New Relic（APM）
```

### 3. スクリプトベース

```bash
#!/bin/bash
# 日次ヘルスチェック

URL="https://YOUR_RAILWAY_URL"

# API 確認
curl -s $URL/api/admin/engine-info > /dev/null && echo "✓ API OK" || echo "✗ API DOWN"

# キャッシュ確認
CACHE_SIZE=$(curl -s $URL/api/admin/cache-stats | jq .totalSize)
echo "キャッシュサイズ: $CACHE_SIZE bytes"

# 実行
if [ $CACHE_SIZE -gt 500000000 ]; then
  curl -s -X POST $URL/api/admin/cache-clear
  echo "キャッシュをクリア"
fi
```

---

## 📊 ダッシュボード例

### Railway ダッシュボード確認項目

```
Project: meeting-summary
├── Deployments
│   ├── Status: ✅ Active
│   ├── Last Deploy: 2 hours ago
│   └── Build Logs: Check for errors
├── Metrics
│   ├── CPU: 5-10%
│   ├── Memory: 200MB
│   └── Network: < 1 MB/s
├── Logs
│   ├── Last 100 lines
│   └── Error patterns
└── Variables
    ├── ANTHROPIC_API_KEY: ✓
    ├── WHISPER_MODEL: base
    └── ENABLE_CACHE: true
```

---

## 🚨 インシデント対応

### シナリオ 1: API がダウン

```
1. Railway ダッシュボール確認
2. ログで エラーメッセージ確認
3. サービス再起動（自動 or 手動）
4. 復旧確認
```

### シナリオ 2: 高メモリ使用率

```
1. キャッシュサイズ確認
2. キャッシュ自動クリーンアップ実行
3. メモリ増加を検討（> 1GB）
```

### シナリオ 3: 音声処理が遅い

```
1. CPU/メモリ使用率を確認
2. 同時処理数を確認
3. キューイング機能の導入検討
```

---

## 📝 ログ分析ガイド

### エラーログのフィルタリング

```bash
# ERROR を含むログを確認
grep "ERROR" app.log

# 特定のエラーパターンを集計
grep "Whisper" app.log | grep -c "Error"
```

### パフォーマンスログ

```bash
# 処理時間を抽出
grep "processing time" app.log | awk '{print $NF}'

# 平均処理時間を計算
grep "processing time" app.log | awk '{sum+=$NF; count++} END {print sum/count}'
```

---

## 💾 ログローテーション

### Railway での設定

```
ログは自動的に保持：
- 最新 7日間を表示
- より古いログはアーカイブ
- 月ごとにリセット
```

### ローカルでのログ記録

```bash
# Railway ログをダウンロード
railway logs > logs_$(date +%Y%m%d).log

# 定期実行（cron）
0 2 * * * railway logs >> /backup/logs/$(date +%Y%m%d).log
```

---

## 📊 メトリクスレポート例

### 週次レポートテンプレート

```
期間: 2026年7月21日～7月27日

API 稼働率: 99.9%
- ダウンタイム: 8分
- エラー率: 0.05%

処理統計:
- 総処理件数: 245件
- 平均処理時間: 6.2分
- キャッシュヒット率: 15%

リソース使用:
- 平均 CPU: 8%
- 平均メモリ: 320MB
- 総データ転送: 45GB

コスト:
- サーバー: $5
- 帯域幅: 含まれる
- 合計: $5
```

---

## 🎯 改善アクション例

### キャッシュヒット率が低い場合

```
現状: 15%（低い）
目標: 30%以上
対策:
- キャッシュ TTL を延長
- より多くのファイルをキャッシュ
```

### 処理時間が長い場合

```
現状: 8分
目標: 5分以下
対策:
- faster-whisper を有効化
- メモリを増加
- GPU を追加（将来）
```

---

## 🔄 監視の自動化

### 推奨ツール

```
1. GitHub Actions
   - 日次ヘルスチェック
   - パフォーマンスレポート生成

2. Railway Webhooks
   - デプロイ失敗時の通知
   - リソース超過時のアラート

3. Slack 統合
   - エラー通知
   - 日次ダイジェスト
```

### 実装例

```yaml
# .github/workflows/health-check.yml
name: Daily Health Check
on:
  schedule:
    - cron: '0 9 * * *'

jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - name: API Health Check
        run: |
          curl -s ${{ secrets.RAILWAY_URL }}/api/admin/engine-info
          curl -s ${{ secrets.RAILWAY_URL }}/api/admin/cache-stats
      - name: Notify Slack
        if: failure()
        run: |
          # Slack 通知ロジック
```

---

## 📞 トラブルシューティング

### よくある問題と解決策

| 問題 | 原因 | 解決策 |
|------|------|--------|
| API 遅い | メモリ不足 | メモリを増加 |
| エラー多い | モデル不適切 | tiny に変更 |
| キャッシュ満杯 | クリーンアップ未実行 | 手動削除 |

---

**最終更新**: 2026年7月21日  
**バージョン**: 1.2.0
