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
            removalPolicy: aws_cdk_lib_1.RemovalPolicy.DESTROY, // 開発用
        });
        // Lambda関数作成 - esbuildでバンドル済み
        const lambdaFunction = new aws_cdk_lib_2.aws_lambda.Function(this, 'TodoFunction', {
            runtime: aws_cdk_lib_2.aws_lambda.Runtime.NODEJS_20_X,
            code: aws_cdk_lib_2.aws_lambda.Code.fromAsset('../../backend/dist', {
                bundling: {
                    image: aws_cdk_lib_2.aws_lambda.Runtime.NODEJS_20_X.bundlingImage,
                    command: [
                        'bash', '-c',
                        'cd /asset-input && npm ci --only=production && cp -r node_modules /asset-output/ && cp worker.js /asset-output/'
                    ],
                    local: {
                        tryBundle(outputDir) {
                            // ローカルではesbuildでバンドル済みのファイルを使用
                            return false;
                        },
                    },
                },
            }),
            handler: 'worker.handler',
            environment: {
                TABLE_NAME: table.tableName,
                DEPLOY_TIMESTAMP: Date.now().toString(),
            },
            timeout: aws_cdk_lib_1.Duration.seconds(30),
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
        // CORS設定 - ルートレベルで設定
        api.root.addCorsPreflight({
            allowOrigins: ['*'], // 開発用にすべてのオリジンを許可
            allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
            allowHeaders: ['Content-Type', 'Authorization'],
        });
        // Lambda統合 - プロキシ統合として設定
        const lambdaIntegration = new aws_cdk_lib_2.aws_apigateway.LambdaIntegration(lambdaFunction, {
            proxy: true, // すべてのリクエストをLambdaに転送
        });
        // ルートパスをLambdaにマッピング（プロキシ統合）
        api.root.addMethod('GET', lambdaIntegration);
        api.root.addMethod('POST', lambdaIntegration);
        api.root.addMethod('PUT', lambdaIntegration);
        api.root.addMethod('DELETE', lambdaIntegration);
        // APIリソースも設定（後方互換性のため）
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
//# sourceMappingURL=backend-stack.js.map