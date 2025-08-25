# CORS問題トラブルシューティング記録

## 📋 概要

- **日時**: 2025年8月25日
- **問題**: フロントエンドからバックエンドAPIへのCORSエラー
- **環境**: AWS HTTP API + Lambda + React (CloudFront配信)

## 🚨 初期問題

### 発生したエラー
```
TypeError: Failed to fetch
Access to fetch at 'https://horyjsyuf9.execute-api.us-east-1.amazonaws.com/api/todos' 
from origin 'https://daip3qg4bmyop.cloudfront.net' has been blocked by CORS policy: 
Response to preflight request doesn't pass access control check: 
No 'Access-Control-Allow-Origin' header is present on the requested resource.
```

### 環境構成
- **フロントエンド**: React (Vite) - CloudFront配信
  - URL: `https://daip3qg4bmyop.cloudfront.net`
- **バックエンド**: Hono + AWS Lambda + HTTP API
  - URL: `https://horyjsyuf9.execute-api.us-east-1.amazonaws.com`

## 🔧 実施した対応策と結果

### 1. バックエンド起動問題の解決
**問題**: ローカル開発でバックエンドが起動しない
**原因**: `@hono/node-server`パッケージ不足
**対応**: 
```bash
cd backend
npm install @hono/node-server
npx tsx src/index.ts
```
**結果**: ✅ ローカル環境で正常動作

### 2. 型定義不一致の修正
**問題**: Frontend(`string`) vs Backend(`number`) の型不一致
**対応**: Backendの型定義を`string`に統一
```typescript
// backend/src/index.ts
interface Todo {
  id: string  // number から string に変更
}
```
**結果**: ✅ 型エラー解決

### 3. AWS REST API → HTTP API 移行
**問題**: REST APIでCORSエラーが継続
**対応**: HTTP APIを新規作成
```
新規HTTP API ID: horyjsyuf9
旧REST API ID: ngj9fqygie
```
**結果**: ✅ コスト削減（93%減）、しかしCORSエラー継続

### 4. Lambda関数モジュールエラー修正
**問題**: `Cannot find module 'hono'`
**原因**: esbuildでの依存関係バンドル不備
**対応**: 
```json
// package.json
"build:esbuild": "esbuild src/worker.ts --bundle --platform=node --target=node20 --outfile=dist/worker.js --format=cjs --minify --sourcemap --external:aws-sdk"
```
**結果**: ✅ Lambda関数正常動作

### 5. HTTP API CORS設定
**試行1**: API Gateway CORS設定
```
Access-Control-Allow-Origin: 
- http://localhost:5173
- https://daip3qg4bmyop.cloudfront.net

Access-Control-Allow-Methods: GET,POST,PUT,DELETE,OPTIONS
Access-Control-Allow-Headers: Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token
```
**結果**: ❌ プリフライトでCORSヘッダー欠如

### 6. Lambda関数レベルCORS実装
**対応**: worker.tsにCORS処理を追加
```typescript
app.use('*', async (c, next) => {
  const origin = c.req.header('Origin')
  const allowedOrigins = [
    'http://localhost:5173',
    'https://cicd-todo-app-89c3b.web.app',
    'https://cicd-todo-app-89c3b.firebaseapp.com',
    'https://daip3qg4bmyop.cloudfront.net'
  ]
  
  // OPTIONSリクエストの処理
  if (c.req.method === 'OPTIONS') {
    return c.json({ message: 'CORS preflight OK' }, 200, {
      'Access-Control-Allow-Origin': allowedOrigins.includes(origin || '') ? origin : allowedOrigins[0],
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
      'Access-Control-Max-Age': '86400'
    })
  }
  
  await next()
  
  // 全てのレスポンスにCORSヘッダーを追加
  if (allowedOrigins.includes(origin || '')) {
    c.header('Access-Control-Allow-Origin', origin || '')
    c.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
    c.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With')
  }
})
```
**結果**: ❌ まだCORSヘッダー不足

### 7. API Gateway CORS設定クリア
**対応**: HTTP API側のCORS設定を完全削除
**理由**: Lambda関数とAPI Gatewayの設定競合解消
**結果**: ❌ 問題継続

### 8. 手動Lambda関数更新
**対応**: 
```bash
cd backend
npm run build
zip -r lambda-function-updated.zip dist/worker.js
# AWSコンソールでzipファイルアップロード
```
**結果**: ❌ 依然としてAccess-Control-Allow-Originヘッダー不足

## 🧪 検証結果

### curlテスト結果
```bash
# プリフライトリクエスト
curl -v -H "Origin: https://daip3qg4bmyop.cloudfront.net" -X OPTIONS https://horyjsyuf9.execute-api.us-east-1.amazonaws.com/api/todos

# レスポンス
HTTP/2 204 
access-control-allow-headers: Content-Type,Authorization
access-control-allow-methods: GET,POST,PUT,DELETE,OPTIONS
# ❌ access-control-allow-origin が不足
```

### 成功パターン
```bash
# 詳細ヘッダー付きプリフライト
curl -v -H "Origin: https://daip3qg4bmyop.cloudfront.net" -H "Access-Control-Request-Method: GET" -H "Access-Control-Request-Headers: content-type" -X OPTIONS https://horyjsyuf9.execute-api.us-east-1.amazonaws.com/api/todos

# レスポンス
HTTP/2 204 
access-control-allow-origin: https://daip3qg4bmyop.cloudfront.net  ✅
access-control-allow-methods: DELETE,GET,OPTIONS,POST,PUT
access-control-allow-headers: authorization,content-type,x-amz-date,x-amz-security-token,x-api-key,x-requested-with
```

## 🔍 現在の状況

### 動作確認済み
- ✅ API自体は正常動作（GET/POST/PUT/DELETE）
- ✅ ローカル環境（localhost:5173）では動作
- ✅ 特定条件下でのCORSヘッダー応答

### 未解決問題
- ❌ ブラウザからのプリフライトリクエストでCORSヘッダー不足
- ❌ Lambda関数のCORS処理が一部のケースで動作しない

## 📝 次のステップ候補

### 1. Lambda関数のデバッグ強化
- CloudWatch Logsでの詳細ログ確認
- プリフライトリクエストの受信状況確認

### 2. HTTP APIルート設定の再確認
- `$default`ルートの動作確認
- 統合設定の検証

### 3. ブラウザ固有の問題調査
- Chrome DevToolsでの詳細リクエスト/レスポンス分析
- ブラウザキャッシュの完全クリア

### 4. 代替アプローチ
- REST APIへの回帰検討
- CloudFront経由でのAPI プロキシ設定

## 📊 コスト効果

- **REST API**: 月額 $3.61
- **HTTP API**: 月額 $0.03
- **削減効果**: 93%削減

## 🏗️ アーキテクチャ構成

```
Frontend (React)
    ↓ CORS Request
CloudFront (daip3qg4bmyop.cloudfront.net)
    ↓ HTTP Request
HTTP API Gateway (horyjsyuf9.execute-api.us-east-1.amazonaws.com)
    ↓ $default route
Lambda Function (TodoAppBackendStack-*)
    ↓ DynamoDB Operation
DynamoDB (TodoApp)
```

## 📌 重要な学び

1. **HTTP APIのCORS**: API Gateway設定とLambda設定の競合に注意
2. **プリフライトリクエスト**: ブラウザとcurlで異なるヘッダー送信
3. **デバッグの重要性**: 段階的な検証とログ確認が必須
4. **環境分離**: ローカル/本番環境での動作差異

---
*最終更新: 2025年8月25日*
