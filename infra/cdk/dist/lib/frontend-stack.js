"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FrontendStack = void 0;
const aws_cdk_lib_1 = require("aws-cdk-lib");
const aws_cdk_lib_2 = require("aws-cdk-lib");
class FrontendStack extends aws_cdk_lib_1.Stack {
    constructor(scope, id, props) {
        super(scope, id, props);
        // S3バケットの作成 - 静的ホスティング用
        const websiteBucket = new aws_cdk_lib_2.aws_s3.Bucket(this, 'TodoAppWebsiteBucket', {
            removalPolicy: aws_cdk_lib_1.RemovalPolicy.DESTROY, // 開発用に削除可能に設定
            autoDeleteObjects: true,
            blockPublicAccess: aws_cdk_lib_2.aws_s3.BlockPublicAccess.BLOCK_ALL, // パブリックアクセスを完全に禁止
            accessControl: aws_cdk_lib_2.aws_s3.BucketAccessControl.PRIVATE,
            objectOwnership: aws_cdk_lib_2.aws_s3.ObjectOwnership.BUCKET_OWNER_ENFORCED,
        });
        // CloudFront Origin Access Identity (OAI) の作成
        // これによりCloudFrontのみがS3バケットにアクセスできる
        const originAccessIdentity = new aws_cdk_lib_2.aws_cloudfront.OriginAccessIdentity(this, 'TodoAppOAI');
        // S3バケットポリシーの設定 - CloudFrontのみアクセス可能
        websiteBucket.addToResourcePolicy(new aws_cdk_lib_2.aws_iam.PolicyStatement({
            sid: 'AllowCloudFrontAccess',
            effect: aws_cdk_lib_2.aws_iam.Effect.ALLOW,
            principals: [originAccessIdentity.grantPrincipal],
            actions: ['s3:GetObject'],
            resources: [websiteBucket.arnForObjects('*')],
        }));
        // CloudFrontディストリビューションの作成
        const distribution = new aws_cdk_lib_2.aws_cloudfront.Distribution(this, 'TodoAppDistribution', {
            defaultBehavior: {
                origin: new aws_cdk_lib_2.aws_cloudfront_origins.S3Origin(websiteBucket, {
                    originAccessIdentity,
                }),
                viewerProtocolPolicy: aws_cdk_lib_2.aws_cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
                // SPA用のキャッシュ設定
                cachePolicy: aws_cdk_lib_2.aws_cloudfront.CachePolicy.CACHING_OPTIMIZED,
                // 静的アセットのキャッシュ設定
                responseHeadersPolicy: aws_cdk_lib_2.aws_cloudfront.ResponseHeadersPolicy.CORS_ALLOW_ALL_ORIGINS,
            },
            // SPA用のエラーページ設定 - 404エラーをindex.htmlにリダイレクト
            errorResponses: [
                {
                    httpStatus: 404,
                    responseHttpStatus: 200,
                    responsePagePath: '/index.html',
                    ttl: aws_cdk_lib_1.Duration.minutes(30),
                },
                {
                    httpStatus: 403,
                    responseHttpStatus: 200,
                    responsePagePath: '/index.html',
                    ttl: aws_cdk_lib_1.Duration.minutes(30),
                },
            ],
            // デフォルトのルートオブジェクト
            defaultRootObject: 'index.html',
            // 価格クラス - 無料枠内で収まるように設定
            priceClass: aws_cdk_lib_2.aws_cloudfront.PriceClass.PRICE_CLASS_100,
        });
        // CloudFormation Outputs - デプロイ後に取得できる情報
        this.exportValue(websiteBucket.bucketName, { name: 'WebsiteBucketName' });
        this.exportValue(distribution.distributionId, { name: 'DistributionId' });
        this.exportValue(distribution.distributionDomainName, { name: 'DistributionDomainName' });
    }
}
exports.FrontendStack = FrontendStack;
//# sourceMappingURL=frontend-stack.js.map