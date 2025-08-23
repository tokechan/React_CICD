import { Stack, StackProps, Duration, RemovalPolicy } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import {
  aws_lambda as lambda,
  aws_apigateway as apigateway,
  aws_dynamodb as dynamodb,
  aws_iam as iam,
} from 'aws-cdk-lib';

export class BackendStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    // DynamoDBテーブル作成
    const table = new dynamodb.Table(this, 'TodoTable', {
      partitionKey: { name: 'id', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: RemovalPolicy.DESTROY, // 開発用
    });

    // Lambda関数作成 - 事前にビルドしたファイルを使用
    const lambdaFunction = new lambda.Function(this, 'TodoFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      code: lambda.Code.fromAsset('../../backend'),
      handler: 'dist/worker.handler',
      environment: {
        TABLE_NAME: table.tableName,
        DEPLOY_TIMESTAMP: Date.now().toString(),
      },
      timeout: Duration.seconds(30),
      memorySize: 256,
    });

    // DynamoDBアクセス権限付与
    table.grantReadWriteData(lambdaFunction);

    // API Gateway作成 - サンプルリポジトリのベストプラクティスに従う
    const api = new apigateway.RestApi(this, 'TodoApi', {
      restApiName: 'Todo API',
      description: 'Todo application API',
      deployOptions: {
        stageName: 'prod',
      },
    });

    // CORS設定 - シンプルに設定
    api.root.addCorsPreflight({
      allowOrigins: ['*'],
      allowMethods: ['*'],
      allowHeaders: ['*'],
    });

    // Lambda統合 - サンプルリポジトリのベストプラクティスに従う
    const lambdaIntegration = new apigateway.LambdaIntegration(lambdaFunction, {
      proxy: true,
    });

    // ルートレベルのプロキシ統合
    api.root.addMethod('ANY', lambdaIntegration);

    // プロキシリソースの設定（サンプルリポジトリのベストプラクティス）
    const proxyResource = api.root.addResource('{proxy+}');
    proxyResource.addMethod('ANY', lambdaIntegration);

    // プロキシ統合の設定を削除して、完全にLambdaに任せる
    // Honoがすべてのルーティングを処理するため、個別ルート設定は不要

    // CloudFormation Outputs
    this.exportValue(api.url, { name: 'ApiUrl' });
    this.exportValue(table.tableName, { name: 'TableName' });
  }
}