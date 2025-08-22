# GitHub Actions CI/CD Setup

このプロジェクトは GitHub Actions を使って AWS S3 + CloudFront への自動デプロイを行います。

## 必要な GitHub Secrets

以下のシークレットを GitHub リポジトリに設定してください：

### 1. AWS 認証情報

- `AWS_ACCESS_KEY_ID`: AWS アクセスキー ID
- `AWS_SECRET_ACCESS_KEY`: AWS シークレットアクセスキー
- `AWS_REGION`: 使用する AWS リージョン（例: `us-east-1`）

### 2. IAM ポリシーの推奨設定

AWS ユーザーに以下のポリシーをアタッチしてください：

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject",
        "s3:DeleteObject",
        "s3:ListBucket",
        "s3:PutBucketPolicy",
        "s3:GetBucketPolicy"
      ],
      "Resource": [
        "arn:aws:s3:::todo-app-website-*",
        "arn:aws:s3:::todo-app-website-*/*"
      ]
    },
    {
      "Effect": "Allow",
      "Action": [
        "cloudfront:CreateInvalidation",
        "cloudfront:GetDistribution",
        "cloudfront:ListDistributions"
      ],
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "cloudformation:DescribeStacks",
        "cloudformation:CreateStack",
        "cloudformation:UpdateStack",
        "cloudformation:DeleteStack",
        "cloudformation:DescribeStackEvents"
      ],
      "Resource": "arn:aws:cloudformation:*:*:stack/TodoAppFrontendStack/*"
    }
  ]
}
```

## ワークフロー実行

### 1. インフラデプロイ（初回のみ）

`infra/cdk/` ディレクトリの変更をプッシュすると自動的に実行されます。

### 2. フロントエンドデプロイ

`frontend/` ディレクトリの変更をプッシュすると自動的に実行されます。

### 3. 手動実行

- インフラデプロイ: GitHub Actions タブから `Deploy Infrastructure with CDK` を手動実行

## デプロイ後の URL

デプロイが完了すると、GitHub Actions のログに以下の情報が出力されます：

- S3 バケット名
- CloudFront ディストリビューション ID
- CloudFront の URL（本番アクセス用）

## トラブルシューティング

### CDK Bootstrap が必要な場合

初回デプロイ時に以下のエラーが発生する場合：

```
CDK Bootstrapが必要
```

これは自動的に解決されますが、手動で実行したい場合は：

```bash
cd infra/cdk
npx cdk bootstrap
```

### 権限エラーが発生する場合

GitHub Actions のログで権限エラーが発生する場合：

1. IAM ユーザーの権限を確認
2. GitHub Secrets の AWS 認証情報を確認
3. AWS リージョンの設定を確認
