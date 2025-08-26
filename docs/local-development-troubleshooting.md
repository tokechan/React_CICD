# ローカル開発環境でのフロントエンド・バックエンド連携トラブルシューティング

## 問題の概要

ローカル開発環境で、フロントエンド（React + Vite）とバックエンド（Hono）が正常に連携できない問題が発生しました。
具体的には、500 Internal Server Error が発生し、プロキシ経由での API 接続ができませんでした。

## 問題の症状

- フロントエンド: `localhost:5173` で正常動作
- バックエンド: `localhost:3001` で正常動作
- プロキシ経由の API 呼び出し: `localhost:5173/api/todos` で **500 エラー**

## 根本原因

### 1. 環境変数設定の問題

`.env.local`ファイルに本番環境の API URL が設定されていたため、ローカル開発時でも本番環境に接続しようとしていました。

```bash
# 問題のある設定
VITE_API_BASE_URL=https://ngj9fqygie.execute-api.us-east-1.amazonaws.com/prod
```

### 2. プロキシ設定の症状

Vite のプロキシログで以下のエラーが確認されました：

```
Proxy request: GET /api/todos -> /prod/api/todos
Error: getaddrinfo ENOTFOUND ngj9fqygie.execute-api.us-east-1.amazonaws.com
```

## 解決手順

### ステップ 1: 問題の特定

`vite.config.ts`にデバッグ情報を追加して、実際にどの URL が使用されているかを確認：

```typescript
// vite.config.ts
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const API_BASE = env.VITE_API_BASE_URL || 'http://localhost:3001';

  // デバッグ情報を出力
  console.log('Vite Config Debug:');
  console.log('  Mode:', mode);
  console.log('  VITE_API_BASE_URL:', env.VITE_API_BASE_URL);
  console.log('  API_BASE (final):', API_BASE);

  // ... rest of config
});
```

### ステップ 2: 環境変数ファイルの修正

`.env.local`ファイルの内容を開発環境用に変更：

```bash
# 修正後の設定
VITE_API_BASE_URL=http://localhost:3001
```

### ステップ 3: CORS 設定の確認

バックエンドの CORS 設定が正しいことを確認：

```typescript
// backend/src/worker.ts
app.use(
  '/api/*',
  cors({
    origin: [
      'http://localhost:5173', // ローカル開発用
      'https://cicd-todo-app-89c3b.web.app',
      'https://cicd-todo-app-89c3b.firebaseapp.com',
    ],
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowHeaders: ['Content-Type'],
  })
);
```

## 解決後の状態

### 成功ログ

**Vite 設定ログ:**

```
Vite Config Debug:
  Mode: development
  VITE_API_BASE_URL: http://localhost:3001
  API_BASE (final): http://localhost:3001
```

**プロキシログ:**

```
Proxy request: GET /api/todos -> /api/todos
Proxy response: 200 /api/todos
```

**バックエンドログ:**

```
<-- GET /api/todos
--> GET /api/todos 200 5ms
<-- POST /api/todos
--> POST /api/todos 201 8ms
```

## 学んだポイント

### 1. 環境変数の優先順位

Vite の環境変数読み込み優先順位：

1. `.env.local` (最高優先度)
2. `.env.development` (開発環境)
3. `.env` (共通設定)
4. `vite.config.ts`のフォールバック値

### 2. プロキシログの重要性

プロキシリクエストのログを確認することで、どこに転送されているかが明確に分かる：

```typescript
// vite.config.ts - プロキシ設定
proxy: {
  '/api': {
    target: API_BASE,
    changeOrigin: true,
    secure: false,
    configure: (proxy, options) => {
      proxy.on('proxyReq', (proxyReq, req, res) => {
        console.log('Proxy request:', req.method, req.url, '->', proxyReq.path);
      });
      proxy.on('proxyRes', (proxyRes, req, res) => {
        console.log('Proxy response:', proxyRes.statusCode, req.url);
      });
    }
  }
}
```

### 3. デバッグ情報の活用

設定値の確認のため、一時的にデバッグ情報を出力することで問題を早期発見できます。

## 推奨設定

### 開発環境用 `.env.local`

```bash
VITE_API_BASE_URL=http://localhost:3001
```

### 本番環境用 (CI/CD で設定)

```bash
VITE_API_BASE_URL=https://ngj9fqygie.execute-api.us-east-1.amazonaws.com/prod
```

## 今後の対策

1. **環境変数の明確な分離**: 開発用と本番用の設定ファイルを明確に分ける
2. **デバッグ機能の常設**: 開発時のトラブルシューティングのため、設定値確認機能を残す
3. **ログの活用**: プロキシログやバックエンドログを確認する習慣をつける

---

**作成日**: 2025-08-26  
**解決時間**: 約 1 時間  
**主要原因**: 環境変数設定ミス  
**解決方法**: .env.local ファイルの修正
