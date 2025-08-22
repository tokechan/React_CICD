# AWS S3 + CloudFront セットアップガイド

## 概要

このガイドでは、React アプリを AWS S3 + CloudFront でデプロイするための AWS コンソール設定手順を説明します。

## 1. AWS アカウント準備

- AWS マネジメントコンソールにアクセス
- 既存アカウント or 新規アカウント作成
- 無料枠の確認（S3: 5GB, CloudFront: 1TB/月）

## 2. IAM ユーザー作成（ReactCICD）

### 2.1 ユーザー作成

- IAM サービス → ユーザー → ユーザー作成
- ユーザー名: `ReactCICD`
- アクセスの種類: プログラムでのアクセス

### 2.2 アクセスキー作成

- 作成したユーザー → セキュリティ認証情報タブ
- アクセスキーの作成
- CSV ファイルダウンロード（重要：安全な場所に保存）

### 2.3 権限設定

- アクセス許可タブ → アクセス許可を追加
- 以下のポリシーをアタッチ：
  - `AdministratorAccess`（全権限 - 開発用）
  - または以下の個別ポリシー：
    - `IAMFullAccess`
    - `AmazonS3FullAccess`
    - `CloudFrontFullAccess`
    - `AWSCloudFormationFullAccess`
    - `AmazonEC2ContainerRegistryFullAccess`

## 3. AWS CLI 設定（ローカル PC）

```bash
# AWS CLI設定
aws configure

# 入力内容：
AWS Access Key ID: [ReactCICDユーザーのアクセスキーID]
AWS Secret Access Key: [ReactCICDユーザーのシークレットアクセスキー]
Default region name: us-east-1
Default output format: json
```

## 4. CDK ブートストラップ

```bash
cd infra/cdk
npx cdk bootstrap
```

## 5. インフラデプロイ

```bash
npx cdk deploy --require-approval never
```

## 6. GitHub Secrets 設定

GitHub リポジトリ → Settings → Secrets and variables → Actions

以下の Secrets を追加：
WS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_REGION=us-east-1

## 7. 自動デプロイテスト

```bash
git add .
git commit -m "Deploy AWS S3 + CloudFront infrastructure"
git push origin main
```

## 8. デプロイ後の確認

- CloudFormation コンソールでスタック確認
- S3 バケットと CloudFront ディストリビューションの作成確認
- アクセス URL 取得：`https://[CloudFrontドメイン].cloudfront.net`

## トラブルシューティング

### IAM 権限エラー

- `iam:GetUser`エラー → `IAMReadOnlyAccess`を追加
- `iam:CreateRole`エラー → `IAMFullAccess`を追加
- `ecr:CreateRepository`エラー → `AmazonEC2ContainerRegistryFullAccess`を追加

### AWS CLI 設定エラー

- 古い設定が残っている → `aws configure`で再設定
- region 未設定 → `aws configure set region us-east-1`

## コスト管理

- **無料枠内での運用**：S3 5GB + CloudFront 1TB/月
- **コストモニタリング**：Billing & Cost Management ダッシュボードで確認

## セキュリティ注意点

- パブリックアクセスは完全に禁止
- CloudFront OAI（Origin Access Identity）を使用
- GitHub Secrets で認証情報管理
