# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

## AWS S3 + CloudFront デプロイ

このプロジェクトは AWS S3 + CloudFront を使用してお金をかけない構成でデプロイ可能です。

### デプロイ手順

1. **インフラデプロイ**（初回のみ）

   ```bash
   cd infra/cdk
   npm install
   npx cdk deploy
   ```

2. **フロントエンドデプロイ**
   ```bash
   # S3バケット名とCloudFrontディストリビューションIDを取得
   npm run deploy:frontend --bucket=your-bucket-name --distribution-id=your-distribution-id
   ```

### 環境変数設定

API エンドポイントは環境変数で設定できます：

```bash
# .envファイルを作成
VITE_API_BASE_URL=https://your-api-gateway-url.execute-api.region.amazonaws.com/prod
```

### セキュリティ設定

- S3 バケットはパブリックアクセスを完全に禁止
- CloudFront のみが S3 バケットにアクセス可能
- CloudFront OAI（Origin Access Identity）を使用
- SPA 用の 404/403 エラーハンドリング設定済み

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default tseslint.config([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      ...tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      ...tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      ...tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
]);
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x';
import reactDom from 'eslint-plugin-react-dom';

export default tseslint.config([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
]);
```
