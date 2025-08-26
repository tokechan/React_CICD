# AWS コンソール確認・設定チェックリスト

## 🎯 デプロイ後に確認すべき項目

### 1. **DynamoDB 設定確認**

#### 📍 確認場所

- AWS コンソール → DynamoDB → Tables

#### ✅ チェック項目

- [ ] テーブル名: `TodoAppBackendStack-TodoTable-XXXXXX`が存在
- [ ] パーティションキー: `id` (String)が設定済み
- [ ] 課金モード: On-demand (PAY_PER_REQUEST)
- [ ] ステータス: Active

#### 🔧 必要に応じて設定

- **ポイントインタイムリカバリ**: 本番運用時は有効化推奨
- **暗号化**: デフォルト暗号化で十分（既に有効）
- **バックアップ**: 重要なデータがある場合は設定

---

### 2. **Lambda 関数設定確認**

#### 📍 確認場所

- AWS コンソール → Lambda → Functions

#### ✅ チェック項目

- [ ] 関数名: `TodoAppBackendStack-TodoFunction-XXXXXX`が存在
- [ ] ランタイム: Node.js 20.x
- [ ] ハンドラー: `dist/worker.handler`
- [ ] タイムアウト: 30 秒
- [ ] メモリ: 256MB

#### 🔧 環境変数確認

```
TABLE_NAME = TodoAppBackendStack-TodoTable-XXXXXX
DEPLOY_TIMESTAMP = (最新のデプロイ時刻)
```

#### 🔧 IAM ロール確認

- DynamoDB への`Read/Write`権限があること
- CloudWatch Logs への書き込み権限があること

---

### 3. **API Gateway 設定確認**

#### 📍 確認場所

- AWS コンソール → API Gateway → APIs

#### ✅ チェック項目

- [ ] API 名: `Todo API`が存在
- [ ] ステージ: `prod`がデプロイ済み
- [ ] リソース: `/{proxy+}`と`/`が設定済み

#### 🔧 CORS 設定確認

**期待値:**

```
Access-Control-Allow-Origin:
  - https://dajp3qg4bmyop.cloudfront.net
  - http://localhost:5173

Access-Control-Allow-Methods:
  - GET, POST, PUT, DELETE, OPTIONS

Access-Control-Allow-Headers:
  - Content-Type, Authorization, X-Requested-With

Access-Control-Max-Age: 86400
```

#### 🧪 テスト方法

```bash
# API Gatewayエンドポイントの確認
curl -H "Origin: https://dajp3qg4bmyop.cloudfront.net" \
     -I "https://YOUR_API_ID.execute-api.us-east-1.amazonaws.com/prod/api/todos"
```

---

### 4. **CloudFront 設定確認**

#### 📍 確認場所

- AWS コンソール → CloudFront → Distributions

#### ✅ チェック項目

- [ ] ディストリビューション: 既存のもの（`dajp3qg4bmyop.cloudfront.net`）
- [ ] ステータス: Deployed
- [ ] Origin: S3 バケット（フロントエンド用）

#### 🔧 必要に応じて設定

- **カスタムエラーページ**: SPA 用に 404→index.html リダイレクト
- **キャッシュポリシー**: 静的ファイル用に最適化

---

### 5. **S3 設定確認**

#### 📍 確認場所

- AWS コンソール → S3 → Buckets

#### ✅ チェック項目

- [ ] フロントエンド用バケットが存在
- [ ] 静的ウェブサイトホスティングが有効
- [ ] CloudFront からのアクセス権限設定済み

---

## 🚨 トラブルシューティング

### DynamoDB アクセスエラー

```
症状: Lambda関数でDynamoDBエラー
原因: IAMロールの権限不足
解決: Lambda実行ロールにDynamoDB権限を追加
```

### CORS エラー

```
症状: ブラウザでCORSエラー
確認: API Gateway のCORS設定
解決: allowed origins にCloudFrontドメインを追加
```

### Lambda 関数エラー

```
症状: 500 Internal Server Error
確認: CloudWatch Logsでエラー詳細を確認
ログ場所: /aws/lambda/TodoAppBackendStack-TodoFunction-XXXXXX
```

---

## 📋 本番運用前の最終チェック

### セキュリティ

- [ ] IAM ロール最小権限の原則
- [ ] DynamoDB 暗号化有効
- [ ] API Gateway アクセス制御（必要に応じて）

### パフォーマンス

- [ ] Lambda 関数のメモリ・タイムアウト最適化
- [ ] DynamoDB キャパシティモードの確認
- [ ] CloudFront キャッシュ設定

### 監視・ログ

- [ ] CloudWatch ダッシュボード設定
- [ ] アラーム設定（エラー率、レスポンス時間等）
- [ ] ログ保持期間設定

### バックアップ・災害復旧

- [ ] DynamoDB ポイントインタイムリカバリ
- [ ] 重要データの定期バックアップ
- [ ] マルチリージョン展開（必要に応じて）

---

## 🔗 有用な AWS コンソールリンク

- [DynamoDB Tables](https://console.aws.amazon.com/dynamodb/home#tables:)
- [Lambda Functions](https://console.aws.amazon.com/lambda/home#/functions)
- [API Gateway APIs](https://console.aws.amazon.com/apigateway/home#/apis)
- [CloudFront Distributions](https://console.aws.amazon.com/cloudfront/home#/distributions)
- [CloudWatch Logs](https://console.aws.amazon.com/cloudwatch/home#logsV2:log-groups)
