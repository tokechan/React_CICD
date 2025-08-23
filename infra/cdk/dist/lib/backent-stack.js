"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BackendStack = void 0;
const aws_cdk_lib_1 = require("aws-cdk-lib");
const aws_cdk_lib_2 = require("aws-cdk-lib");
class BackendStack extends aws_cdk_lib_1.Stack {
    constructor(scope, id, props) {
        super(scope, id, props);
        // DynamoDBテーブル作成
        const table = new aws_cdk_lib_2.aws_dynamodb.Table(this, 'TodoTable', {
            partitionKey: { name: 'id', type: aws_cdk_lib_2.aws_dynamodb.AttributeType.STRING },
            billingMode: aws_cdk_lib_2.aws_dynamodb.BillingMode.PAY_PER_REQUEST,
            removalPolicy: cdk.RemovalPolicy.DESTROY, // 開発用
        });
        // Lambda関数作成
        const lambdaFunction = new aws_cdk_lib_2.aws_lambda.Function(this, 'TodoFunction', {
            runtime: aws_cdk_lib_2.aws_lambda.Runtime.NODEJS_20_X,
            code: aws_cdk_lib_2.aws_lambda.Code.fromAsset('../backend/dist'),
            handler: 'worker.handler',
            environment: {
                TABLE_NAME: table.tableName,
            },
            timeout: cdk.Duration.seconds(30),
            memorySize: 256,
        });
        // DynamoDBアクセス権限付与
        table.grantReadWriteData(lambdaFunction);
        // API Gateway作成
        const api = new aws_cdk_lib_2.aws_apigateway.RestApi(this, 'TodoApi', {
            restApiName: 'Todo API',
            description: 'Todo application API',
            deployOptions: {
                stageName: 'prod',
                loggingLevel: aws_cdk_lib_2.aws_apigateway.MethodLoggingLevel.INFO,
            },
        });
        // CORS設定
        api.addCorsPreflight({
            allowOrigins: ['https://dajp3qg4bmyop.cloudfront.net'],
            allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
            allowHeaders: ['Content-Type', 'Authorization'],
        });
        // Lambda統合
        const lambdaIntegration = new aws_cdk_lib_2.aws_apigateway.LambdaIntegration(lambdaFunction);
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
exports.BackendStack = BackendStack;
//# sourceMappingURL=backent-stack.js.map