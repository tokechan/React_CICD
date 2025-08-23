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

    // Lambda関数作成 - esbuildで完全にバンドル済み
    const lambdaFunction = new lambda.Function(this, 'TodoFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      code: lambda.Code.fromAsset('../../backend/dist'),
      handler: 'worker.handler',
      environment: {
        TABLE_NAME: table.tableName,
        DEPLOY_TIMESTAMP: Date.now().toString(),
      },
      timeout: Duration.seconds(30),
      memorySize: 256,
    });

    // DynamoDBアクセス権限付与
    table.grantReadWriteData(lambdaFunction);

    // API Gateway作成
    const api = new apigateway.RestApi(this, 'TodoApi', {
      restApiName: 'Todo API',
      description: 'Todo application API',
      deployOptions: {
        stageName: 'prod',
        loggingLevel: apigateway.MethodLoggingLevel.INFO,
      },
    });

    // CORS設定 - ルートレベルで設定
    api.root.addCorsPreflight({
      allowOrigins: ['*'], // 開発用にすべてのオリジンを許可
      allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowHeaders: ['Content-Type', 'Authorization'],
    });

    // Lambda統合 - サンプルリポジトリのベストプラクティスに従う
    const lambdaIntegration = new apigateway.LambdaIntegration(lambdaFunction, {
      proxy: true,
    });

    // ルートパスをLambdaにマッピング（プロキシ統合）
    api.root.addMethod('GET', lambdaIntegration);
    api.root.addMethod('POST', lambdaIntegration);
    api.root.addMethod('PUT', lambdaIntegration);
    api.root.addMethod('DELETE', lambdaIntegration);

    // プロキシ統合の設定を削除して、完全にLambdaに任せる
    // Honoがすべてのルーティングを処理するため、個別ルート設定は不要

    // CloudFormation Outputs
    this.exportValue(api.url, { name: 'ApiUrl' });
    this.exportValue(table.tableName, { name: 'TableName' });
  }
}