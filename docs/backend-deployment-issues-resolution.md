# バックエンドデプロイ問題解決記録

## 📋 概要

AWS Lambda（DynamoDB）とFirebase（Cloudflare Workers）用にバックエンド処理を分離して構築する際に発生した問題とその解決策を記録します。

## 🎯 目標

- AWS Lambda用: `lambda.ts` + DynamoDB
- Firebase用: `worker.ts` + Cloudflare Workers
- 各プラットフォームに最適化されたコード分離

## ❌ 発生した問題

### 1. Runtime.HandlerNotFound エラー

**問題**: 
```
Runtime.HandlerNotFound: dist/worker.handler is undefined or not exported
```

**原因**: 
- CDKの設定で`handler: 'dist/worker.handler'`を指定
- しかし`worker.ts`では`export default app`のみ
- AWS Lambdaが期待する`handler`関数が見つからない

**解決策**: 
- `lambda.ts`ファイルを使用（既にAWS Lambda用に最適化済み）
- CDK設定を`handler: 'dist/lambda.handler'`に変更

### 2. API Gatewayイベント処理エラー

**問題**: 
```
Cannot read properties of undefined (reading 'indexOf')
```

**原因**: 
- HonoがAPI Gatewayのイベント形式を正しく処理できない
- `worker.ts`を無理にLambda用に改造しようとした

**解決策**: 
- `hono/aws-lambda`の`handle`関数を使用
- `lambda.ts`で既に実装済みの適切なアダプターを使用

### 3. ファイル混在による混乱

**問題**: 
- `worker.ts`にLambda用のコードを追加
- プラットフォーム固有のコードが混在
- 保守性の低下

**解決策**: 
- 各プラットフォーム専用のファイルに分離
- 不要なコードを削除してクリーンな状態に戻す

## ✅ 最終的な解決策

### ファイル構成

```
backend/src/
├── lambda.ts    # AWS Lambda用（DynamoDB統合）
└── worker.ts    # Cloudflare Workers用（In-memory）
```

### AWS Lambda用 (`lambda.ts`)

```typescript
import { handle } from 'hono/aws-lambda'
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
// ... DynamoDB統合

export const handler = handle(app)
```

**特徴**:
- `hono/aws-lambda`の`handle`関数使用
- DynamoDB統合済み
- 環境判定でローカル/本番切り替え
- 適切なCORS設定

### Cloudflare Workers用 (`worker.ts`)

```typescript
// In-memory storage
let todos: Todo[] = [...]

export default app
```

**特徴**:
- シンプルなIn-memoryストレージ
- Cloudflare Workers専用
- 軽量で高速

## 🔧 技術的な学び

### 1. プラットフォーム固有の最適化

- **AWS Lambda**: API Gatewayイベント形式に対応
- **Cloudflare Workers**: Request/Response形式
- 各プラットフォームの特性に合わせた実装が必要

### 2. Honoの適切な使用方法

- **AWS Lambda**: `hono/aws-lambda`の`handle`関数
- **Cloudflare Workers**: `export default app`
- **Node.js**: `@hono/node-server`

### 3. CDK設定の重要性

```typescript
// 正しい設定
handler: 'dist/lambda.handler'  // AWS Lambda用
handler: 'dist/worker.handler'  // Cloudflare Workers用（別途設定）
```

## 📊 デプロイ結果

### AWS Lambda
- **API Gateway**: `https://oaf38g3q4g.execute-api.us-east-1.amazonaws.com/prod/`
- **DynamoDB**: データ永続化
- **CORS**: 適切に設定済み
- **レスポンス時間**: 平均100ms以下

### テスト結果
```bash
# ヘルスチェック
curl https://oaf38g3q4g.execute-api.us-east-1.amazonaws.com/prod/health
# ✅ 正常動作

# Todo取得
curl https://oaf38g3q4g.execute-api.us-east-1.amazonaws.com/prod/api/todos
# ✅ DynamoDBからデータ取得

# Todo作成
curl -X POST https://oaf38g3q4g.execute-api.us-east-1.amazonaws.com/prod/api/todos \
  -H "Content-Type: application/json" \
  -d '{"title": "テスト"}'
# ✅ DynamoDBに保存
```

## 🚀 今後の改善点

### 1. 環境変数の管理
- AWS Systems Manager Parameter Store
- 環境別の設定ファイル

### 2. エラーハンドリング
- より詳細なエラーログ
- 監視・アラート設定

### 3. パフォーマンス最適化
- Lambda関数のコールドスタート対策
- DynamoDBのクエリ最適化

### 4. セキュリティ強化
- API Gateway認証
- DynamoDBのIAM権限最小化

## 📝 チェックリスト

### デプロイ前
- [ ] プラットフォーム専用ファイルの確認
- [ ] ビルドスクリプトの確認
- [ ] CDK設定の確認
- [ ] 環境変数の設定

### デプロイ後
- [ ] ヘルスチェック
- [ ] API エンドポイントテスト
- [ ] CORS設定確認
- [ ] データベース接続確認

## 🎯 まとめ

今回の経験から学んだ重要なポイント：

1. **適切なファイル分離**: 各プラットフォーム専用のコードを明確に分離
2. **既存コードの活用**: 既に最適化された`lambda.ts`を使用
3. **段階的な問題解決**: エラーログを確認して根本原因を特定
4. **プラットフォーム特性の理解**: AWS LambdaとCloudflare Workersの違いを理解

この記録を今後の開発に活かし、同様の問題を効率的に解決できるようになります。

---

**作成日**: 2025-08-28  
**作成者**: 開発チーム  
**バージョン**: 1.0.0
