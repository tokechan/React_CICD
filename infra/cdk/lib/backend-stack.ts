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

    // Lambda関数作成
    const lambdaFunction = new lambda.Function(this, 'TodoFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      code: lambda.Code.fromAsset('../../backend/dist'),
      handler: 'worker.handler',
      environment: {
        TABLE_NAME: table.tableName,
        DEPLOY_TIMESTAMP: Date.now().toString(), // 強制的に新しいデプロイをトリガー
      },
      timeout: Duration.seconds(30),
      memorySize: 256,
      bundling: {
        minify: true,
        sourceMap: true,
        target: 'node18',
        loader: {
          '.js': 'js',
          '.ts': 'ts',
        },
        define: {
          'process.env.NODE_ENV': '"production"',
        },
        banner: {
          js: '// Lambda function bundled with esbuild',
        },
        external: [],
        nodeModules: ['hono', '@aws-sdk/client-dynamodb', '@aws-sdk/lib-dynamodb'],
        commandHooks: {
          beforeBundling(inputDir: string, outputDir: string): string[] {
            return [];
          },
          afterBundling(inputDir: string, outputDir: string): string[] {
            return [];
          },
          beforeInstall(inputDir: string, outputDir: string): string[] {
            return [];
          },
        },
      },
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

    // CORS設定
    api.root.addCorsPreflight({
      allowOrigins: ['https://dajp3qg4bmyop.cloudfront.net'],
      allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowHeaders: ['Content-Type', 'Authorization'],
    });

    // Lambda統合
    const lambdaIntegration = new apigateway.LambdaIntegration(lambdaFunction);

    // APIエンドポイント設定
    const apiResource = api.root.addResource('api');
    const todosResource = apiResource.addResource('todos');

    todosResource.addMethod('GET', lambdaIntegration);
    todosResource.addMethod('POST', lambdaIntegration);

    const todoResource = todosResource.addResource('{id}');
    todoResource.addMethod('GET', lambdaIntegration);
    todoResource.addMethod('PUT', lambdaIntegration);
    todoResource.addMethod('DELETE', lambdaIntegration);

    // CloudFormation Outputs
    this.exportValue(api.url, { name: 'ApiUrl' });
    this.exportValue(table.tableName, { name: 'TableName' });
  }
}