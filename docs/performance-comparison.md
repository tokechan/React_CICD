# AWS vs Firebase パフォーマンス比較

## 概要
同じコードベースでAWSとFirebaseにデプロイし、パフォーマンスを比較する学習プロジェクト。

## 構成

### ハイブリッド構成
- **フロントエンド**: Firebase Hosting / AWS S3 + CloudFront
- **バックエンド**: AWS API Gateway + Lambda (Hono)

### デプロイ方法
- **GitHub Actions**で手動選択デプロイ
- 同じコードベースで両プラットフォームにデプロイ可能

## パフォーマンス測定項目

### 1. 初期ロード時間
- [ ] Firebase Hosting
- [ ] AWS S3 + CloudFront

### 2. API応答時間
- [ ] Firebase → AWS API Gateway
- [ ] AWS S3 → AWS API Gateway

### 3. 地理的レイテンシー
- [ ] 日本からのアクセス
- [ ] 海外からのアクセス

### 4. スケーラビリティ
- [ ] 同時接続数
- [ ] 負荷テスト

## 測定方法

### ブラウザ開発者ツール
- Network タブでリクエスト時間を測定
- Performance タブでレンダリング時間を測定

### 外部ツール
- [ ] PageSpeed Insights
- [ ] GTmetrix
- [ ] WebPageTest

## 結果記録

### Firebase Hosting
```
初期ロード時間: ___ms
API応答時間: ___ms
総合評価: ___
```

### AWS S3 + CloudFront
```
初期ロード時間: ___ms
API応答時間: ___ms
総合評価: ___
```

## 学んだこと

### CORS設定の重要性
- ハイブリッド構成ではCORS設定が重要
- フロントエンドとバックエンドのドメインが異なる場合の設定

### CI/CDの利点
- 同じコードで複数プラットフォームにデプロイ可能
- 環境変数による設定切り替え

### トラブルシューティング
- 200 OKでもCORSエラーが発生する場合
- ブラウザキャッシュの影響

## 今後の活用

### プロジェクト選択時の判断基準
- **Firebase**: 小〜中規模、開発速度重視
- **AWS**: 大規模、カスタマイズ性重視

### 学習成果
- CI/CDパイプライン構築経験
- マルチクラウド構成の理解
- 本番環境でのトラブルシューティング経験
