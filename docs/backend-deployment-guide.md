# バックエンドデプロイガイド

## 概要
このプロジェクトでは、同じコードベースで異なるプラットフォームにデプロイできます。

## ファイル構成

### Cloudflare Workers用
- **ファイル**: `src/worker.ts`
- **デプロイ**: `npm run deploy`
- **特徴**: In-memoryストレージ、Firebase Hosting用CORS設定

### AWS Lambda用
- **ファイル**: `src/lambda.ts`
- **デプロイ**: `npm run deploy:lambda`
- **特徴**: DynamoDBストレージ、AWS S3 + CloudFront用CORS設定

## デプロイ方法

### Cloudflare Workers（Firebase構成用）
```bash
cd backend
npm run deploy
```

### AWS Lambda（AWS構成用）
```bash
cd backend
npm run deploy:lambda
```

## 開発方法

### ローカル開発（Cloudflare Workers）
```bash
cd backend
npm run dev
```

### ローカル開発（AWS Lambda）
```bash
cd backend
npm run dev:lambda
```

## CORS設定

### Cloudflare Workers
```typescript
origin: [
  'http://localhost:5173',
  'https://cicd-todo-app-89c3b.web.app',  // Firebase Hosting
  'https://cicd-todo-app-89c3b.firebaseapp.com',
]
```

### AWS Lambda
```typescript
origin: [
  'http://localhost:5173',
  'https://dajp3qg4bmyop.cloudfront.net',  // AWS CloudFront
]
```

## ストレージ

### Cloudflare Workers
- **In-memory**: アプリケーション再起動時にリセット
- **用途**: シンプルなテスト・デモ

### AWS Lambda
- **DynamoDB**: 永続化ストレージ
- **用途**: 本番環境

## パフォーマンス比較

### 測定項目
1. **初期ロード時間**
2. **API応答時間**
3. **地理的レイテンシー**
4. **スケーラビリティ**

### 比較方法
```bash
# Firebase + Cloudflare Workers
curl https://your-worker.your-subdomain.workers.dev/api/todos

# AWS + Lambda
curl https://your-api-gateway-url.execute-api.region.amazonaws.com/prod/api/todos
```

## トラブルシューティング

### CORSエラー
- フロントエンドのURLがCORS設定に含まれているか確認
- ブラウザのキャッシュをクリア

### デプロイエラー
- 環境変数が正しく設定されているか確認
- プラットフォーム固有の設定を確認
