# 開発テンプレート・ボイラープレート集

## CORS 設定テンプレート

### 1. フロントエンド設定 (Vite)

```typescript
// vite.config.ts
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  // 環境別API設定
  const getApiConfig = () => {
    const baseUrl = env.VITE_API_BASE_URL;

    if (mode === 'development') {
      return {
        target: baseUrl || 'http://localhost:3001',
        fallback: 'http://localhost:3001',
      };
    }

    return {
      target: baseUrl || 'https://api.example.com',
      fallback: 'https://api.example.com',
    };
  };

  const apiConfig = getApiConfig();

  // デバッグ情報（開発時のみ）
  if (mode === 'development') {
    console.log('🔧 Vite Config Debug:');
    console.log('  Mode:', mode);
    console.log('  VITE_API_BASE_URL:', env.VITE_API_BASE_URL);
    console.log('  API Target:', apiConfig.target);
  }

  return {
    plugins: [react()],
    server: {
      port: 5173,
      proxy: {
        '/api': {
          target: apiConfig.target,
          changeOrigin: true,
          secure: mode === 'production',
          configure: (proxy, options) => {
            // プロキシログ（開発時のみ）
            if (mode === 'development') {
              proxy.on('proxyReq', (proxyReq, req, res) => {
                console.log(
                  '📤 Proxy request:',
                  req.method,
                  req.url,
                  '->',
                  proxyReq.path
                );
              });
              proxy.on('proxyRes', (proxyRes, req, res) => {
                console.log('📥 Proxy response:', proxyRes.statusCode, req.url);
              });
              proxy.on('error', (err, req, res) => {
                console.error('❌ Proxy error:', err.message, 'for', req.url);
              });
            }
          },
        },
      },
    },
  };
});
```

### 2. バックエンド設定 (Hono)

```typescript
// backend/src/cors-config.ts
export const getCorsConfig = () => {
  const isDevelopment = process.env.NODE_ENV === 'development';

  const allowedOrigins = [
    // 開発環境
    'http://localhost:3000',
    'http://localhost:5173',
    'http://localhost:8080',

    // 本番環境
    process.env.FRONTEND_URL || 'https://myapp.com',

    // ステージング環境
    process.env.STAGING_URL || 'https://staging.myapp.com',
  ].filter(Boolean); // undefined を除外

  return {
    origin: allowedOrigins,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'Accept',
      'Origin',
    ],
    credentials: true,
    optionsSuccessStatus: 200,
  };
};

// backend/src/worker.ts
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { getCorsConfig } from './cors-config';

const app = new Hono();

// CORS設定を適用
app.use('*', cors(getCorsConfig()));

// 開発時のデバッグ情報
if (process.env.NODE_ENV === 'development') {
  console.log('🔧 CORS Config:', getCorsConfig());
}
```

### 3. 環境変数テンプレート

```bash
# .env.development
VITE_API_BASE_URL=http://localhost:3001
NODE_ENV=development

# .env.production
VITE_API_BASE_URL=https://api.myapp.com
NODE_ENV=production

# .env.staging
VITE_API_BASE_URL=https://api-staging.myapp.com
NODE_ENV=staging
```

### 4. API クライアントテンプレート

```typescript
// src/lib/api-client.ts
const getApiUrl = (path: string): string => {
  const isDev = import.meta.env.DEV;

  if (isDev) {
    // 開発環境：プロキシ経由
    return `/api${path}`;
  } else {
    // 本番環境：直接API
    const baseUrl = import.meta.env.VITE_API_BASE_URL;
    if (!baseUrl) {
      throw new Error('VITE_API_BASE_URL is not defined');
    }
    return `${baseUrl}${path}`;
  }
};

export const apiClient = {
  get: async (path: string) => {
    const response = await fetch(getApiUrl(path));
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    return response.json();
  },

  post: async (path: string, data: any) => {
    const response = await fetch(getApiUrl(path), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    return response.json();
  },
};

// デバッグ情報（開発時のみ）
if (import.meta.env.DEV) {
  console.log('🔧 API Client Config:');
  console.log('  Environment:', import.meta.env.MODE);
  console.log('  Base URL:', import.meta.env.VITE_API_BASE_URL);
  console.log('  Sample API call:', getApiUrl('/health'));
}
```

## パッケージ化テンプレート

### package.json scripts

```json
{
  "scripts": {
    "dev": "concurrently \"npm run dev:backend\" \"npm run dev:frontend\"",
    "dev:frontend": "cd frontend && npm run dev",
    "dev:backend": "cd backend && npm run dev",
    "dev:debug": "DEBUG=* npm run dev",
    "test:cors": "curl -H \"Origin: http://localhost:5173\" http://localhost:3001/api/health"
  }
}
```

## トラブルシューティングチェックリスト

### CORS エラー発生時の確認順序

1. **環境変数確認**

   ```bash
   echo $VITE_API_BASE_URL
   cat .env.local
   ```

2. **プロキシログ確認**

   - Vite の console で proxy request/response を確認

3. **CORS 設定確認**

   ```bash
   curl -H "Origin: http://localhost:5173" -v http://localhost:3001/api/health
   ```

4. **ネットワークタブ確認**
   - ブラウザの DevTools で実際のリクエスト先を確認

### よくある間違いパターン

1. **.env ファイルの優先順位間違い**

   - .env.local > .env.development > .env

2. **CORS origin の typo**

   - `http://localhost:5173` vs `http://localhost:5173/`

3. **プロキシ設定の rewrite 忘れ**
   - `/api/todos` → `/prod/api/todos` の余分な変換

## 使用方法

1. **新プロジェクト作成時**

   - このテンプレートをコピー
   - 環境変数を自分のプロジェクトに合わせて変更

2. **既存プロジェクトに適用**

   - 段階的に設定を移行
   - まずはデバッグ機能から追加

3. **チーム共有**
   - このドキュメントをプロジェクトの docs/ に配置
   - README.md から参照

---

**更新日**: 2025-08-26  
**対象**: React + Vite + Hono  
**テスト済み環境**: Node.js 20+, npm 10+
