# AWS CORS トラブルシューティング完全ガイド

## 📋 概要

React + Vite フロントエンドと AWS Lambda（Hono）+ API Gateway バックエンドの本番環境での CORS 問題を解決した完全記録。
このガイドは実際のトラブルシューティング過程を記録し、今後の開発で同様の問題を効率的に解決するためのテンプレートとして活用できます。

## 🎯 最終構成

### ローカル開発環境

- **フロントエンド**: `localhost:5173` (Vite)
- **バックエンド**: `localhost:3001` (Hono + Node.js)
- **データストレージ**: メモリ内ストレージ
- **CORS 処理**: Hono middleware

### 本番環境

- **フロントエンド**: `https://dajp3qg4bmyop.cloudfront.net/` (CloudFront)
- **バックエンド**: `https://mxlaeds4kb.execute-api.us-east-1.amazonaws.com/prod/` (API Gateway + Lambda)
- **データストレージ**: DynamoDB
- **CORS 処理**: Lambda（Hono）middleware ← **重要ポイント**

## 🚨 発生した問題の時系列

### 問題 1: 初期の CORS エラー

#### 📊 症状

- 本番環境で CORS エラーが発生
- DevTools Network タブで CORS ヘッダーが見えない
- Request URL: `https://ngj9fqygie.execute-api.us-east-1.amazonaws.com/prod/todos`

#### 🔍 調査結果

- `.env.production`ファイルが存在しない
- フロントエンドが正しい API URL を認識していない

#### 🛠️ 解決アクション

1. `.env.production`ファイルを作成
2. `VITE_API_BASE_URL`を設定
3. フロントエンド API URL ロジックを修正

```typescript
// frontend/src/api/todoApi.ts
const getApiUrl = (path: string) => {
  if (import.meta.env.DEV) {
    return `/api${path}`;
  } else {
    const baseUrl = import.meta.env.VITE_API_BASE_URL || '';
    return `${baseUrl}/api${path}`;
  }
};
```

### 問題 2: API Gateway URL 構造の不整合

#### 📊 症状

- フロントエンドが `/prod/todos` にアクセス
- 実際は `/prod/api/todos` が正しいパス

#### 🔍 調査結果

- API Gateway ステージ名（`/prod`）とアプリケーションパス（`/api`）の混在
- フロントエンドの URL 構築ロジックが不適切

#### 🛠️ 解決アクション

1. API Gateway ステージ名を`prod` → `api`に変更を試行
2. フロントエンド URL 構築ロジックを調整

### 問題 3: CloudFormation/CDK デプロイエラー

#### 📊 症状

- CDK デプロイ時に`Invalid API identifier`エラー
- API Gateway リソースが壊れた状態

#### 🔍 調査結果

- CloudFormation スタック内の API Gateway リソースが不整合状態
- 手動でのステージ名変更が原因でリソース ID が無効化

#### 🛠️ 解決アクション

1. **根本解決**: CloudFormation スタック削除・再作成

```bash
aws cloudformation delete-stack --stack-name TodoAppBackendStack
npx cdk deploy TodoAppBackendStack
```

### 問題 4: DNS 解決エラー

#### 📊 症状

- `Could not resolve host: ngj9fqygie.execute-api.us-east-1.amazonaws.com`
- API 自体が存在しない状態

#### 🔍 調査結果

- 古い API Gateway URL が無効化
- CloudFormation スタック削除により新しい API が作成された

#### 🛠️ 解決アクション

1. 新しい API Gateway URL を確認: `https://mxlaeds4kb.execute-api.us-east-1.amazonaws.com/prod/`
2. `.env.production`を新しい URL に更新
3. フロントエンド再ビルド・デプロイ

### 問題 5: 最終的な CORS ヘッダー不足

#### 📊 症状

- API 自体は 200 で応答
- CORS ヘッダーが返されていない

#### 🔍 調査結果

- **重要発見**: Lambda プロキシ統合では**Lambda 側で CORS 処理が必須**
- API Gateway の CORS 設定だけでは不十分

#### 🛠️ 解決アクション

Lambda（Hono）で CORS 処理を有効化：

```typescript
// backend/src/worker.ts
// CORS設定：全環境で適用（Lambdaプロキシ統合ではLambda側でCORS処理が必須）
app.use(
  '/api/*',
  cors({
    origin: [
      'http://localhost:5173', // ローカル開発用
      'https://dajp3qg4bmyop.cloudfront.net', // 本番CloudFront
    ],
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  })
);
```

## 🎯 根本原因と最終解決

### 💡 最重要な学び

**AWS Lambda プロキシ統合では、Lambda 関数内で CORS ヘッダーを返す必要がある。**

参考資料:

- [Lambda プロキシ統合と考える API Gateway の CORS](https://blog.serverworks.co.jp/apigateway-lambda-cors)
- [How to enable CORS on API Gateway with Lambda proxy integration](https://cloudonaut.io/how-to-enable-cors-on-api-gateway-with-lambda-proxy-integration/)

### 🔧 正しい CORS 設定パターン

#### Lambda プロキシ統合での推奨構成

```typescript
// 1. Lambda（Hono）側: 実際のリクエスト用CORS
app.use(
  '/api/*',
  cors({
    origin: ['https://your-cloudfront-domain.net'],
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  })
);

// 2. API Gateway側: プリフライトリクエスト用（オプション）
api.root.addCorsPreflight({
  allowOrigins: ['https://your-cloudfront-domain.net'],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
});
```

## 📋 問題解決チェックリスト

### ステップ 1: 基本設定確認

- [ ] `.env.production`ファイルが存在し、正しい API URL が設定されている
- [ ] フロントエンドの API URL 構築ロジックが正しい
- [ ] ビルド時に正しい環境変数が使用されている

### ステップ 2: API 疎通確認

- [ ] API Gateway が存在し、アクセス可能
- [ ] CloudFormation スタックが正常な状態
- [ ] Lambda 関数が最新のコードでデプロイされている

### ステップ 3: CORS 設定確認

- [ ] Lambda（Hono）で CORS middleware が設定されている
- [ ] 正しい Origin が許可されている
- [ ] 必要なメソッドとヘッダーが許可されている

### ステップ 4: 動作確認

```bash
# CORSヘッダーの確認
curl -H "Origin: https://your-cloudfront-domain.net" \
     -i "https://your-api-gateway-url.amazonaws.com/prod/api/todos"

# レスポンスに以下が含まれることを確認
# access-control-allow-origin: https://your-cloudfront-domain.net
```

## 🛠️ トラブルシューティング手順

### パターン 1: CORS エラーが発生する場合

#### 症状の確認

1. **DevTools Network**タブを開く
2. **Response Headers**に CORS ヘッダーがあるか確認
3. エラーメッセージの詳細を記録

#### 段階的デバッグ

```bash
# 1. API自体の疎通確認
curl -i "https://your-api-url/prod/api/todos"

# 2. CORSヘッダーの確認
curl -H "Origin: https://your-domain.net" \
     -i "https://your-api-url/prod/api/todos"

# 3. OPTIONSリクエストの確認
curl -X OPTIONS \
     -H "Origin: https://your-domain.net" \
     -H "Access-Control-Request-Method: GET" \
     -i "https://your-api-url/prod/api/todos"
```

### パターン 2: API Gateway URL が無効な場合

#### CloudFormation スタック確認

```bash
# スタック状態確認
aws cloudformation describe-stacks --stack-name TodoAppBackendStack

# API URLの取得
aws cloudformation describe-stacks \
  --stack-name TodoAppBackendStack \
  --query "Stacks[0].Outputs[?OutputKey=='ExportApiUrl'].OutputValue" \
  --output text
```

#### スタック再作成手順

```bash
# 1. バックアップ（必要に応じて）
# DynamoDBデータのエクスポートなど

# 2. スタック削除
aws cloudformation delete-stack --stack-name TodoAppBackendStack

# 3. 削除完了待ち
aws cloudformation wait stack-delete-complete \
  --stack-name TodoAppBackendStack

# 4. 再作成
cd infra/cdk
npx cdk deploy TodoAppBackendStack

# 5. 新しいAPI URLの確認と設定更新
```

## 📝 ベストプラクティス

### 開発プロセス

1. **ローカル環境で完全に動作確認**してから本番デプロイ
2. **段階的デプロイ**: バックエンド → フロントエンド の順序
3. **環境変数の明確な管理**: 開発用と本番用の分離

### CORS 設定

1. **Lambda プロキシ統合では必ず Lambda 側で CORS 処理**
2. **開発環境と本番環境の統一した CORS 設定**
3. **最小限の権限**: 必要な Origin、メソッド、ヘッダーのみ許可

### インフラ管理

1. **Infrastructure as Code**: CDK での一元管理
2. **リソース削除時の影響範囲確認**
3. **バックアップとロールバック計画**

## 🔧 再利用可能なテンプレート

### Hono CORS 設定テンプレート

```typescript
import { Hono } from 'hono';
import { cors } from 'hono/cors';

const app = new Hono();

// 環境判定
const isLocalDevelopment = () => {
  return !process.env.AWS_REGION && !process.env.TABLE_NAME;
};

// CORS設定：全環境で適用
app.use(
  '/api/*',
  cors({
    origin: [
      'http://localhost:5173', // ローカル開発用
      'https://your-cloudfront-domain.net', // 本番環境
    ],
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  })
);

if (isLocalDevelopment()) {
  console.log('🔧 CORS enabled for local development');
} else {
  console.log('🚀 CORS enabled for production (Lambda proxy integration)');
}
```

### フロントエンド API クライアントテンプレート

```typescript
// 環境に応じたAPI URL構築
const getApiUrl = (path: string) => {
  if (import.meta.env.DEV) {
    // 開発環境：Viteプロキシを使用
    return `/api${path}`;
  } else {
    // 本番環境：環境変数のベースURLを使用
    const baseUrl = import.meta.env.VITE_API_BASE_URL || '';
    return `${baseUrl}/api${path}`;
  }
};

// 使用例
export const fetchTodos = async () => {
  const response = await fetch(getApiUrl('/todos'));
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  return response.json();
};
```

### 環境変数設定テンプレート

```bash
# .env.development
VITE_API_BASE_URL=http://localhost:3001

# .env.production
VITE_API_BASE_URL=https://your-api-gateway-url.execute-api.region.amazonaws.com/prod
```

## 🎯 今後の改善案

### 短期改善

1. **エラーハンドリングの強化**: より詳細なエラーメッセージ
2. **ログ出力の統一**: 開発・本番環境での一貫したログ形式
3. **ヘルスチェックエンドポイント**: API の生存確認用

### 長期改善

1. **カスタムドメイン設定**: CORS の簡素化
2. **CDN 設定の最適化**: API リクエストのキャッシュ戦略
3. **モニタリングの強化**: CloudWatch での詳細な監視

## 📚 参考資料

- [API Gateway での REST API の CORS - AWS 公式ドキュメント](https://docs.aws.amazon.com/ja_jp/apigateway/latest/developerguide/how-to-cors.html)
- [Lambda プロキシ統合と考える API Gateway の CORS - サーバーワークス](https://blog.serverworks.co.jp/apigateway-lambda-cors)
- [How to enable CORS on API Gateway with Lambda proxy integration - cloudonaut](https://cloudonaut.io/how-to-enable-cors-on-api-gateway-with-lambda-proxy-integration/)
- [CORS Middleware - Hono 公式ドキュメント](https://hono.dev/docs/middleware/builtin/cors)

---

**作成日**: 2025-08-26  
**問題解決時間**: 約 3 時間  
**主要原因**: Lambda プロキシ統合での CORS 設定不備  
**最終解決方法**: Lambda（Hono）での CORS 処理 + CloudFormation スタック再作成
