# 本番環境 CORS エラー - 体系的トラブルシューティング手順

## 🎯 目的

ローカル環境では動作するが、本番環境（CloudFront + API Gateway）で CORS エラーが発生する問題を解決する。

## 📊 現在の状況

- **ローカル環境**: ✅ 正常動作
- **本番環境**: ❌ CORS エラー
- **確認された URL**: `https://ngj9fqygie.execute-api.us-east-1.amazonaws.com/prod/todos`
- **手動変更済み**: CDK で API Gateway ステージを`prod` → `api`に変更

## 🔍 Step by Step 調査手順

### Step 1: デプロイ状況の確認

```bash
# 1.1 GitHub Actionsの最新実行確認
# - 手動変更がデプロイされているか
# - デプロイ成功/失敗の確認

# 1.2 AWS CloudFormationスタック確認
aws cloudformation describe-stacks --stack-name TodoAppBackendStack
```

### Step 2: API Gateway URL の確認

```bash
# 2.1 CloudFormation OutputでAPI URL確認
aws cloudformation describe-stacks \
  --stack-name TodoAppBackendStack \
  --query "Stacks[0].Outputs[?OutputKey=='ApiUrl'].OutputValue" \
  --output text

# 2.2 API Gatewayコンソールで直接確認
# - ステージ名が 'api' になっているか
# - CORS設定が適用されているか
```

### Step 3: フロントエンド環境変数確認

```bash
# 3.1 本番ビルド時の環境変数確認
# GitHub Actions Secretsで設定されている値

# 3.2 CloudFrontにデプロイされているフロントエンドの確認
# - 正しいAPI URLが使用されているか
# - ビルド時の環境変数が正しく反映されているか
```

### Step 4: CORS 設定の詳細確認

```bash
# 4.1 curlでCORSヘッダー確認
curl -H "Origin: https://dajp3qg4bmyop.cloudfront.net" \
     -H "Access-Control-Request-Method: GET" \
     -H "Access-Control-Request-Headers: Content-Type" \
     -X OPTIONS \
     "https://ngj9fqygie.execute-api.us-east-1.amazonaws.com/api/api/todos"

# 4.2 実際のGETリクエスト確認
curl -H "Origin: https://dajp3qg4bmyop.cloudfront.net" \
     -I \
     "https://ngj9fqygie.execute-api.us-east-1.amazonaws.com/api/api/todos"
```

## 🛠️ 修正方法の選択肢

### 選択肢 A: 新しい API URL (/api) を使用（推奨）

```typescript
// 1. CDKデプロイが完了していることを確認
// 2. 新しいAPI Gateway URLを取得
// 3. 環境変数を更新
VITE_API_BASE_URL=https://ngj9fqygie.execute-api.us-east-1.amazonaws.com/api

// 4. フロントエンド再ビルド・デプロイ
```

### 選択肢 B: 既存の API URL (/prod) に対応

```typescript
// フロントエンドのAPI URLロジックを調整
const getApiUrl = (path: string) => {
  if (import.meta.env.DEV) {
    return `/api${path}`;
  } else {
    const baseUrl = import.meta.env.VITE_API_BASE_URL || '';
    return `${baseUrl}/api${path}`; // /api を明示的に追加
  }
};
```

## 🚨 よくある問題パターン

### 1. デプロイの非同期性

- **症状**: CDK を変更したがまだ古い URL が使われている
- **原因**: GitHub Actions がまだ実行中、または失敗している
- **確認方法**: GitHub Actions の実行状況確認

### 2. 環境変数の設定ミス

- **症状**: 本番環境で間違った API URL が使用されている
- **原因**: GitHub Secrets の設定が古い、または設定されていない
- **確認方法**: GitHub Actions のログで環境変数を確認

### 3. キャッシュ問題

- **症状**: 変更が反映されない
- **原因**: CloudFront のキャッシュ、ブラウザキャッシュ
- **解決方法**: CloudFront キャッシュ無効化、ハードリフレッシュ

### 4. CORS 設定の不整合

- **症状**: 正しい URL でも CORS エラー
- **原因**: API Gateway の CORS 設定とフロントエンドの Origin が不一致
- **確認方法**: DevTools で Response Headers を確認

## 📋 チェックリスト

### デプロイ確認

- [ ] GitHub Actions が最新コミットで成功している
- [ ] CloudFormation スタックが更新されている
- [ ] API Gateway に新しいステージ(/api)が存在する

### URL 確認

- [ ] CloudFormation Output で API URL を確認
- [ ] フロントエンドで使用されている環境変数を確認
- [ ] 実際の HTTP リクエスト URL を確認

### CORS 確認

- [ ] API Gateway の CORS 設定確認
- [ ] preflight リクエスト(OPTIONS)が成功する
- [ ] Response Headers に CORS ヘッダーが含まれる

### 環境変数確認

- [ ] GitHub Secrets で VITE_API_BASE_URL が正しく設定されている
- [ ] ビルド時に正しい環境変数が使用されている
- [ ] 本番環境で正しい API URL が使用されている

## 🎯 次のアクション

1. **即座に確認すべき項目**

   - GitHub Actions の実行状況
   - 現在の API Gateway URL
   - 本番環境での実際のリクエスト URL

2. **修正が必要な場合**

   - 環境変数の更新
   - フロントエンドの再ビルド・デプロイ
   - API Gateway の設定確認

3. **動作確認**
   - curl での CORS ヘッダー確認
   - ブラウザ DevTools での詳細確認
   - 実際のアプリケーション動作テスト

---

**作成日**: 2025-08-26  
**対象**: 本番環境 CORS エラー  
**参考**: local-development-troubleshooting.md
