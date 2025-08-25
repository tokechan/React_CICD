import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// mode（development/production）に応じて .env* を読む
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '') // '' で VITE_* 以外も読み込める
  const API_BASE = env.VITE_API_BASE_URL || 'http://localhost:3001' // devフォールバック

  return {
    plugins: [react(), tailwindcss()],
    base: '/', // CloudFrontでルート配信ならこれでOK
    server: {
      // 開発中は /api をバックエンドへプロキシ（フロントからは相対パスでOK）
      proxy: {
        '/api': {
          target: API_BASE,
          changeOrigin: true,
          secure: true,
          // もし API_BASE 側にステージパスが含まれる場合は rewrite で調整
          // rewrite: (p) => p.replace(/^\/api/, '/prod/api'),
        },
      },
    },
    preview: {
      port: 4173,
      host: true,
    },
    build: {
      outDir: 'dist',
      assetsDir: 'assets',
      sourcemap: mode !== 'production', // デバッグしやすく
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ['react', 'react-dom'],
          },
        },
      },
      // chunkSizeWarningLimit: 600, // 必要なら警告閾値を上げる
    },
    // たとえば window.__APP_VERSION__ を埋め込みたい場合：
    // define: { __APP_VERSION__: JSON.stringify(process.env.npm_package_version) },
  }
})
