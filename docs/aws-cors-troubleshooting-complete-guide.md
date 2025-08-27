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


---

## 🔄 **続編: スタック再作成後の追加問題対応**

### 📅 **対応日**: 2025-08-27

### 🚨 **新たに発生した問題**

#### **問題6: GitHubセキュリティによるプッシュブロック**

**症状:**
```
remote: - Push cannot contain secrets
remote: Amazon AWS Access Key ID
remote: Amazon AWS Secret Access Key
```

**原因:** AWSアクセスキーがGitリポジトリにコミットされた

**解決方法:**
1. **機密ファイルの削除とクリーンブランチ作成**
   ```bash
   git checkout -b clean-dev <安全なコミット>
   ```
2. **.gitignoreの強化**
   ```gitignore
   # AWS関連ファイル
   AWS_accessKeys/
   *.pem
   *.key
   *credentials*
   *accessKeys*
   .aws/
   *.csv
   ```

#### **問題7: AWS CLI認証設定とGitHub Actions Secretsの混同**

**症状:** ローカルは動作するがCI/CDでAWS認証エラー

**学習ポイント:**
- **AWS CLI**: ローカル開発用（`~/.aws/credentials`）
- **GitHub Secrets**: CI/CD用（`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`）
- **それぞれ独立して管理が必要**

#### **問題8: DynamoDB権限が反映されない問題**

**症状:** CDKコードに`table.grantReadWriteData(lambdaFunction)`があるのにIAM権限不足

**根本原因:** CloudFormationスタックとCDKコードの不整合

**解決方法:**
```bash
# スタック完全再作成
aws cloudformation delete-stack --stack-name TodoAppBackendStack
aws cloudformation wait stack-delete-complete --stack-name TodoAppBackendStack
npx cdk deploy TodoAppBackendStack --require-approval never
```

#### **問題9: API Gateway URL変更によるDNS解決エラー**

**症状:** 
```
(failed) net::ERR_NAME_NOT_RESOLVED
```

**原因:** スタック再作成でAPI Gateway URLが変更されたが、フロントエンドが古いURLを参照

**解決方法:**
1. **新しいAPI Gateway URLの確認**
   ```bash
   aws apigateway get-rest-apis \
     --query "items[?contains(name, 'Todo')].{Name:name,Id:id}"
   ```
2. **フロントエンドURL更新**
   ```typescript
   // frontend/src/api/todoApi.ts
   const baseUrl = import.meta.env.VITE_API_BASE_URL || 'https://新しいAPI_ID.execute-api.us-east-1.amazonaws.com/prod'
   ```

### ✅ **解決済み機能**
- ✅ **データ取得（GET）**: 正常動作
- ✅ **新しいタスク追加（POST）**: 正常動作
- ✅ **CORS設定**: Lambda側のCORS処理で解決

### ❌ **未解決問題**
- ❌ **チェックボックス更新（PUT）**: 500 Internal Server Error継続

### 🔍 **現在調査中**
- PUT リクエスト時の Lambda 関数内エラー
- DynamoDB UpdateItem 操作の詳細確認が必要

### 📚 **重要な学習ポイント**

1. **GitHubセキュリティ機能**: 機密情報の自動検出とプッシュブロック
2. **認証情報の管理分離**: ローカル vs CI/CD 環境
3. **Infrastructure as Code**: CDKコードと実際のリソースの整合性
4. **リソースID変更**: スタック再作成時の連動する設定更新
5. **段階的デバッグ**: CORS → 権限 → URL → 個別機能の順序

---

**続編作成日**: 2025-08-27  
**対応時間**: 約 2 時間  
**主要学習**: AWS開発での運用実態とトラブルシューティング手法  
**現在のステータス**: 完全解決（全てのAPI操作が正常動作）

---

## 🔧 **Lambda DynamoDB UpdateExpression エラーの完全解決**

### **📋 問題の概要**

AWS Lambda関数でDynamoDB更新処理において、500エラーが発生していた問題の根本原因と解決方法。

### **🔍 発生した問題**

**症状:**
- AWS Lambda invoke コマンドが「Invalid base64」エラーで実行できない
- Lambda関数は実行されるが、PUT操作で500エラーが返される
- エラーメッセージ: `"Failed to update todo"`

**初期の推測:**
- IAM権限の問題
- CORS設定の問題
- DynamoDBアクセス権限の問題

### **🔧 調査プロセス**

#### **1. Lambda Invoke コマンドの修正**

**問題:**
```bash
# ❌ エラーになるコマンド
aws lambda invoke --function-name "TodoAppBackendStack-TodoFunction..." --payload '{"httpMethod": "PUT", ...}' response.json
```

**解決:**
```bash
# ✅ 正しいコマンド
aws lambda invoke \
  --function-name "TodoAppBackendStack-TodoFunction..." \
  --payload file://payload.json \
  --cli-binary-format raw-in-base64-out \
  response.json
```

**重要ポイント:**
- `--cli-binary-format raw-in-base64-out` オプションが必須
- JSONペイロードはファイル経由で渡す (`file://payload.json`)

#### **2. CloudWatchログによる根本原因の特定**

**ログ確認コマンド:**
```bash
# ログストリーム名取得
aws logs describe-log-streams \
  --log-group-name "/aws/lambda/TodoAppBackendStack-TodoFunction..." \
  --order-by LastEventTime --descending --max-items 1

# ログ詳細確認
aws logs get-log-events \
  --log-group-name "/aws/lambda/TodoAppBackendStack-TodoFunction..." \
  --log-stream-name "2025/08/26/[\$LATEST]..."
```

**発見されたエラー:**
```
ValidationException: Invalid UpdateExpression: An expression attribute value used in expression is not defined; attribute value: :title
```

### **🐛 根本原因**

DynamoDB UpdateExpressionで、リクエストボディに含まれていないパラメータ（`:title`）を参照していた。

**問題のあるコード:**
```typescript
// ❌ 問題のあるUpdateExpression
const command = new UpdateCommand({
  UpdateExpression: 'SET title = :title, completed = :completed, updatedAt = :updatedAt',
  ExpressionAttributeValues: {
    ':title': updatedTodo.title,      // titleが未定義の場合エラー
    ':completed': updatedTodo.completed,
    ':updatedAt': updatedTodo.updatedAt,
  },
});
```

**シナリオ:**
- PUTリクエストのボディ: `{"completed": true}` (titleなし)
- UpdateExpressionは`:title`パラメータを期待
- `:title`が未定義でValidationException発生

### **✅ 解決方法**

**動的UpdateExpression構築:**
```typescript
// ✅ 修正されたコード
const updateTodo = async (id: string, updates: Partial<Todo>): Promise<Todo | null> => {
  const existingTodo = await getTodo(id);
  if (!existingTodo) return null;

  const updatedTodo: Todo = {
    ...existingTodo,
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  // DynamoDB UpdateExpressionを動的に構築
  const updateExpressions: string[] = [];
  const expressionAttributeValues: Record<string, any> = {
    ':updatedAt': updatedTodo.updatedAt,
  };

  // titleが提供されている場合のみ更新
  if (updates.title !== undefined) {
    updateExpressions.push('title = :title');
    expressionAttributeValues[':title'] = updatedTodo.title;
  }

  // completedが提供されている場合のみ更新
  if (updates.completed !== undefined) {
    updateExpressions.push('completed = :completed');
    expressionAttributeValues[':completed'] = updatedTodo.completed;
  }

  // updatedAtは常に更新
  updateExpressions.push('updatedAt = :updatedAt');

  const command = new UpdateCommand({
    TableName: tableName,
    Key: { id },
    UpdateExpression: `SET ${updateExpressions.join(', ')}`,
    ExpressionAttributeValues: expressionAttributeValues,
    ReturnValues: 'ALL_NEW',
  });

  const response = await docClient.send(command);
  return (response as any).Attributes as Todo || null;
};
```

### **🔄 デプロイと検証**

**修正後の手順:**
```bash
# 1. バックエンドビルド
cd backend && npm run build

# 2. CDKデプロイ
cd infra/cdk && npx cdk deploy TodoAppBackendStack --require-approval never

# 3. 修正確認
aws lambda invoke \
  --function-name "TodoAppBackendStack-TodoFunction..." \
  --payload file://test_payload.json \
  --cli-binary-format raw-in-base64-out \
  response.json
```

**結果:**
```json
{
  "StatusCode": 200,
  "body": "{\"todo\":{\"completed\":true,\"createdAt\":\"2025-08-27T02:55:09.554Z\",\"id\":\"d8f0af18-e096-49df-8f1a-f8f3558f26f3\",\"updatedAt\":\"2025-08-27T03:27:50.144Z\",\"title\":\"restart\"}}"
}
```

### **📚 重要な学習ポイント**

#### **1. DynamoDB UpdateExpression設計原則**
- **動的構築**: 提供されたフィールドのみを更新対象にする
- **パラメータ安全性**: 未定義パラメータの参照を避ける
- **部分更新対応**: PATCHスタイルの更新を適切に処理

#### **2. AWS CLI デバッグ手法**
- **ペイロード形式**: `--cli-binary-format raw-in-base64-out`の重要性
- **ファイル経由**: 複雑なJSONはfile://プレフィックスで渡す
- **ログ分析**: CloudWatchログが最も信頼できる情報源

#### **3. エラー調査の優先順位**
1. **コマンド実行エラー** → AWS CLI設定の確認
2. **Lambda実行エラー** → CloudWatchログの詳細確認
3. **アプリケーションエラー** → コード・ロジックの確認
4. **権限エラー** → IAMポリシーの確認

#### **4. TypeScript型安全性の活用**
```typescript
// Partial<Todo>を使用した安全な部分更新
interface UpdateTodoRequest {
  title?: string;
  completed?: boolean;
}

// undefinedチェックによる動的処理
if (updates.title !== undefined) {
  // titleが明示的に提供された場合のみ処理
}
```

### **🎯 ベストプラクティス**

#### **DynamoDB UpdateExpression**
```typescript
// ✅ 推奨パターン
const buildUpdateExpression = (updates: Partial<Todo>) => {
  const expressions: string[] = [];
  const values: Record<string, any> = {};
  
  Object.entries(updates).forEach(([key, value]) => {
    if (value !== undefined) {
      expressions.push(`${key} = :${key}`);
      values[`:${key}`] = value;
    }
  });
  
  return {
    UpdateExpression: `SET ${expressions.join(', ')}`,
    ExpressionAttributeValues: values
  };
};
```

#### **Lambda テストコマンド**
```bash
# テスト用ペイロードファイル作成
cat > test_payload.json << 'EOF'
{
  "httpMethod": "PUT",
  "path": "/api/todos/test-id",
  "headers": {
    "Content-Type": "application/json",
    "Origin": "https://your-cloudfront-domain.cloudfront.net"
  },
  "body": "{\"completed\": true}"
}
EOF

# Lambda関数テスト実行
aws lambda invoke \
  --function-name "YourLambdaFunction" \
  --payload file://test_payload.json \
  --cli-binary-format raw-in-base64-out \
  response.json

# レスポンス確認
cat response.json | jq '.'
```

### **⚡ トラブルシューティングチェックリスト**

- [ ] AWS CLI コマンドに `--cli-binary-format raw-in-base64-out` オプション追加
- [ ] ペイロードをファイル経由で渡している
- [ ] CloudWatchログで詳細エラーメッセージを確認
- [ ] DynamoDB UpdateExpressionが動的に構築されている
- [ ] 未定義パラメータの参照を避けている
- [ ] IAM権限が適切に設定されている（CDKの場合は `table.grantReadWriteData()`）

---

**解決完了日**: 2025-08-27  
**解決時間**: 約 1 時間  
**主要学習**: DynamoDB UpdateExpression動的構築とAWS CLIデバッグ手法  
**最終ステータス**: 完全解決（全API操作正常）

