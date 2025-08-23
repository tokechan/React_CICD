# Hono + AWS Lambda バックエンド構築ガイド

## 📋 概要

このガイドでは、既存の Hono バックエンドを AWS Lambda + API Gateway + DynamoDB に移行する方法を説明します。

## 🎯 目標構成

- **ランタイム**: AWS Lambda (Node.js 20.x)
- **API**: API Gateway (REST API)
- **データベース**: DynamoDB
- **フレームワーク**: Hono
- **インフラ**: AWS CDK (TypeScript)

## 💰 コスト見積もり（無料枠内）

| サービス    | 無料枠                  | 想定使用量              | コスト |
| ----------- | ----------------------- | ----------------------- | ------ |
| AWS Lambda  | 100 万リクエスト/月     | 1,000 リクエスト/日     | 無料   |
| API Gateway | 100 万リクエスト/月     | 1,000 リクエスト/日     | 無料   |
| DynamoDB    | 25GB + 200 万リクエスト | 1GB + 30,000 リクエスト | 無料   |
| CloudWatch  | 基本ログ                | 基本使用                | 無料   |

## 🛠️ 実装手順

### ステップ 1: バックエンド CDK スタック作成

**ファイル**: `infra/cdk/lib/backend-stack.ts`（新規作成）

```typescript
import { Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import {
  aws_lambda as lambda,
  aws_apigateway as apigateway,
  aws_dynamodb as dynamodb,
  aws_iam as iam,
} from 'aws-cdk-lib';

export class BackendStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    // DynamoDBテーブル作成
    const table = new dynamodb.Table(this, 'TodoTable', {
      partitionKey: { name: 'id', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY, // 開発用
    });

    // Lambda関数作成
    const lambdaFunction = new lambda.Function(this, 'TodoFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      code: lambda.Code.fromAsset('../backend/dist'),
      handler: 'worker.handler',
      environment: {
        TABLE_NAME: table.tableName,
      },
      timeout: cdk.Duration.seconds(30),
      memorySize: 256,
    });

    // DynamoDBアクセス権限付与
    table.grantReadWriteData(lambdaFunction);

    // API Gateway作成
    const api = new apigateway.RestApi(this, 'TodoApi', {
      restApiName: 'Todo API',
      description: 'Todo application API',
      deployOptions: {
        stageName: 'prod',
        loggingLevel: apigateway.MethodLoggingLevel.INFO,
      },
    });

    // CORS設定
    api.addCorsPreflight({
      allowOrigins: ['https://dajp3qg4bmyop.cloudfront.net'],
      allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowHeaders: ['Content-Type', 'Authorization'],
    });

    // Lambda統合
    const lambdaIntegration = new apigateway.LambdaIntegration(lambdaFunction);

    // APIエンドポイント設定
    const apiResource = api.root.addResource('api');
    const todosResource = apiResource.addResource('todos');

    todosResource.addMethod('GET', lambdaIntegration);
    todosResource.addMethod('POST', lambdaIntegration);

    const todoResource = todosResource.addResource('{id}');
    todoResource.addMethod('GET', lambdaIntegration);
    todoResource.addMethod('PUT', lambdaIntegration);
    todoResource.addMethod('DELETE', lambdaIntegration);

    // CloudFormation Outputs
    this.exportValue(api.url, { name: 'ApiUrl' });
    this.exportValue(table.tableName, { name: 'TableName' });
  }
}
```

### ステップ 2: CDK アプリ更新

**ファイル**: `infra/cdk/bin/app.ts`（更新）

```typescript
#!/usr/bin/env node
import 'source-map-support/register';
import { App } from 'aws-cdk-lib';
import { FrontendStack } from '../lib/frontend-stack';
import { BackendStack } from '../lib/backend-stack'; // 追加

const app = new App();

new FrontendStack(app, 'TodoAppFrontendStack', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
});

new BackendStack(app, 'TodoAppBackendStack', {
  // 追加
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
});

app.synth();
```

### ステップ 3: Hono バックエンドを Lambda 対応に修正

**ファイル**: `backend/src/worker.ts`（更新）

```typescript
import { Hono } from 'hono';
import { handle } from 'hono/aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  UpdateCommand,
  DeleteCommand,
  ScanCommand,
} from '@aws-sdk/lib-dynamodb';

// DynamoDB設定
const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);
const tableName = process.env.TABLE_NAME || 'TodoTable';

// Honoアプリ作成
const app = new Hono();

// 型定義
interface Todo {
  id: string;
  title: string;
  completed: boolean;
  createdAt: string;
  updatedAt: string;
}

// ヘルパー関数
const getTodos = async (): Promise<Todo[]> => {
  const command = new ScanCommand({ TableName: tableName });
  const response = await docClient.send(command);
  return (response.Items as Todo[]) || [];
};

const getTodo = async (id: string): Promise<Todo | null> => {
  const command = new GetCommand({
    TableName: tableName,
    Key: { id },
  });
  const response = await docClient.send(command);
  return (response.Item as Todo) || null;
};

const createTodo = async (
  todo: Omit<Todo, 'createdAt' | 'updatedAt'>
): Promise<Todo> => {
  const now = new Date().toISOString();
  const newTodo: Todo = {
    ...todo,
    createdAt: now,
    updatedAt: now,
  };

  const command = new PutCommand({
    TableName: tableName,
    Item: newTodo,
  });

  await docClient.send(command);
  return newTodo;
};

const updateTodo = async (
  id: string,
  updates: Partial<Todo>
): Promise<Todo | null> => {
  const existingTodo = await getTodo(id);
  if (!existingTodo) return null;

  const updatedTodo: Todo = {
    ...existingTodo,
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  const command = new UpdateCommand({
    TableName: tableName,
    Key: { id },
    UpdateExpression:
      'SET title = :title, completed = :completed, updatedAt = :updatedAt',
    ExpressionAttributeValues: {
      ':title': updatedTodo.title,
      ':completed': updatedTodo.completed,
      ':updatedAt': updatedTodo.updatedAt,
    },
    ReturnValues: 'ALL_NEW',
  });

  const response = await docClient.send(command);
  return (response.Attributes as Todo) || null;
};

const deleteTodo = async (id: string): Promise<boolean> => {
  const command = new DeleteCommand({
    TableName: tableName,
    Key: { id },
  });

  try {
    await docClient.send(command);
    return true;
  } catch (error) {
    return false;
  }
};

// APIエンドポイント
app.get('/api/todos', async (c) => {
  try {
    const todos = await getTodos();
    return c.json({ todos });
  } catch (error) {
    return c.json({ error: 'Failed to fetch todos' }, 500);
  }
});

app.post('/api/todos', async (c) => {
  try {
    const body = await c.req.json();
    const { title } = body;

    if (!title || typeof title !== 'string') {
      return c.json({ error: 'Title is required' }, 400);
    }

    const newTodo = await createTodo({
      id: crypto.randomUUID(),
      title: title.trim(),
      completed: false,
    });

    return c.json({ todo: newTodo }, 201);
  } catch (error) {
    return c.json({ error: 'Failed to create todo' }, 500);
  }
});

app.get('/api/todos/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const todo = await getTodo(id);

    if (!todo) {
      return c.json({ error: 'Todo not found' }, 404);
    }

    return c.json({ todo });
  } catch (error) {
    return c.json({ error: 'Failed to fetch todo' }, 500);
  }
});

app.put('/api/todos/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();
    const { title, completed } = body;

    const updatedTodo = await updateTodo(id, {
      title: title?.trim(),
      completed,
    });

    if (!updatedTodo) {
      return c.json({ error: 'Todo not found' }, 404);
    }

    return c.json({ todo: updatedTodo });
  } catch (error) {
    return c.json({ error: 'Failed to update todo' }, 500);
  }
});

app.delete('/api/todos/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const success = await deleteTodo(id);

    if (!success) {
      return c.json({ error: 'Todo not found' }, 404);
    }

    return c.json({ message: 'Todo deleted successfully' });
  } catch (error) {
    return c.json({ error: 'Failed to delete todo' }, 500);
  }
});

// Lambda handlerとしてexport
export const handler = handle(app);
```

### ステップ 4: バックエンドのビルド設定

**ファイル**: `backend/package.json`（更新）

```json
{
  "name": "todo-backend",
  "version": "1.0.0",
  "description": "Todo App Backend with Hono + AWS Lambda",
  "type": "module",
  "main": "dist/worker.js",
  "scripts": {
    "build": "tsc",
    "dev": "tsx watch src/worker.ts",
    "start": "node dist/worker.js",
    "deploy": "npm run build && cdk deploy TodoAppBackendStack",
    "test": "vitest",
    "lint": "eslint src --ext .ts",
    "type-check": "tsc --noEmit"
  },
  "dependencies": {
    "hono": "^4.6.7",
    "hono/aws-lambda": "^4.6.7",
    "@aws-sdk/client-dynamodb": "^3.0.0",
    "@aws-sdk/lib-dynamodb": "^3.0.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "tsx": "^4.19.2",
    "typescript": "^5.6.3",
    "vitest": "^2.1.8",
    "eslint": "^9.33.0",
    "@typescript-eslint/parser": "^8.39.1",
    "@typescript-eslint/eslint-plugin": "^8.39.1"
  }
}
```

### ステップ 5: フロントエンドの API URL 更新

**ファイル**: `frontend/.env`（新規作成）

```bash
# AWS API Gateway URL（デプロイ後に更新）
VITE_API_BASE_URL=https://your-api-id.execute-api.region.amazonaws.com/prod
```

## 🚀 デプロイ手順

### 1. バックエンドビルド

```bash
cd backend
npm install
npm run build
```

### 2. インフラデプロイ

```bash
cd infra/cdk
npm install
npm run build
npm run deploy
```

### 3. API URL 取得

```bash
# CloudFormation Outputsから取得
aws cloudformation describe-stacks --stack-name TodoAppBackendStack --query "Stacks[0].Outputs"
```

### 4. フロントエンド設定更新

```bash
# frontend/.env を実際のAPI URLに更新
VITE_API_BASE_URL=https://[取得したAPI Gateway URL]/prod
```

### 5. フロントエンド再デプロイ

```bash
cd frontend
npm run build
# GitHub Actionsでデプロイ、または手動デプロイ
```

## 🔧 トラブルシューティング

### エラー: DynamoDB アクセス権限

**解決**: Lambda 関数に DynamoDB アクセス権限を付与

```typescript
table.grantReadWriteData(lambdaFunction);
```

### エラー: CORS エラー

**解決**: API Gateway で CORS 設定

```typescript
api.addCorsPreflight({
  allowOrigins: ['https://your-cloudfront-domain.cloudfront.net'],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
});
```

### エラー: Lambda タイムアウト

**解決**: Lambda 関数のタイムアウト設定

```typescript
timeout: cdk.Duration.seconds(30),
memorySize: 256,
```

## 📊 監視とログ

### CloudWatch Logs

```bash
# Lambda関数のログ確認
aws logs tail /aws/lambda/TodoAppBackendStack-TodoFunctionXXXXX --follow

# API Gatewayのログ確認
aws logs tail /aws/apigateway/TodoApi --follow
```

### CloudWatch Metrics

- Lambda: 呼び出し数、エラー率、実行時間
- API Gateway: リクエスト数、エラー数
- DynamoDB: 読み取り/書き込みキャパシティ

## 🔄 運用と保守

### バックアップ

- DynamoDB: オンデマンドバックアップ
- Lambda: バージョン管理でロールバック可能

### スケーリング

- Lambda: 自動スケーリング（設定不要）
- API Gateway: 自動スケーリング
- DynamoDB: オートスケーリング設定可能

### コスト最適化

- Lambda: メモリサイズ最適化
- DynamoDB: キャパシティモード選択
- API Gateway: キャッシュ設定

## 🎯 次のステップ

1. **バックエンド CDK スタック作成**
2. **Hono コードを Lambda 対応に修正**
3. **インフラデプロイ**
4. **API URL 取得・フロントエンド更新**
5. **テストと動作確認**

## 📝 備考

- このガイドは開発・学習目的用です
- 本番運用時はセキュリティ設定の強化が必要です
- コストは AWS 無料枠内で収まる想定です
- 必要に応じてログと監視の設定を強化してください

---

_このガイドは Hono + AWS Lambda バックエンド構築の完全な手順書です。_
