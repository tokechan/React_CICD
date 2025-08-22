import { Stack, StackProps, RemovalPolicy, Duration } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import {
  aws_s3 as s3,
  aws_cloudfront as cloudfront,
  aws_cloudfront_origins as origins,
  aws_iam as iam,
} from 'aws-cdk-lib';

export class FrontendStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    // S3バケットの作成 - 静的ホスティング用
    const websiteBucket = new s3.Bucket(this, 'TodoAppWebsiteBucket', {
      removalPolicy: RemovalPolicy.DESTROY, // 開発用に削除可能に設定
      autoDeleteObjects: true,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL, // パブリックアクセスを完全に禁止
      accessControl: s3.BucketAccessControl.PRIVATE,
      objectOwnership: s3.ObjectOwnership.BUCKET_OWNER_ENFORCED,
    });

    // CloudFront Origin Access Identity (OAI) の作成
    // これによりCloudFrontのみがS3バケットにアクセスできる
    const originAccessIdentity = new cloudfront.OriginAccessIdentity(
      this,
      'TodoAppOAI'
    );

    // S3バケットポリシーの設定 - CloudFrontのみアクセス可能
    websiteBucket.addToResourcePolicy(
      new iam.PolicyStatement({
        sid: 'AllowCloudFrontAccess',
        effect: iam.Effect.ALLOW,
        principals: [originAccessIdentity.grantPrincipal],
        actions: ['s3:GetObject'],
        resources: [websiteBucket.arnForObjects('*')],
      })
    );

    // CloudFrontディストリビューションの作成
    const distribution = new cloudfront.Distribution(this, 'TodoAppDistribution', {
      defaultBehavior: {
        origin: new origins.S3Origin(websiteBucket, {
          originAccessIdentity,
        }),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        // SPA用のキャッシュ設定
        cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
        // 静的アセットのキャッシュ設定
        responseHeadersPolicy: cloudfront.ResponseHeadersPolicy.CORS_ALLOW_ALL_ORIGINS,
      },
      // SPA用のエラーページ設定 - 404エラーをindex.htmlにリダイレクト
      errorResponses: [
        {
          httpStatus: 404,
          responseHttpStatus: 200,
          responsePagePath: '/index.html',
          ttl: Duration.minutes(30),
        },
        {
          httpStatus: 403,
          responseHttpStatus: 200,
          responsePagePath: '/index.html',
          ttl: Duration.minutes(30),
        },
      ],
      // デフォルトのルートオブジェクト
      defaultRootObject: 'index.html',
      // 価格クラス - 無料枠内で収まるように設定
      priceClass: cloudfront.PriceClass.PRICE_CLASS_100,
    });

    // CloudFormation Outputs - デプロイ後に取得できる情報
    this.exportValue(websiteBucket.bucketName, { name: 'WebsiteBucketName' });
    this.exportValue(distribution.distributionId, { name: 'DistributionId' });
    this.exportValue(distribution.distributionDomainName, { name: 'DistributionDomainName' });
  }
}
