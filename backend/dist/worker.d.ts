export declare const handler: <L extends import("hono/aws-lambda").LambdaEvent>(event: L, lambdaContext?: import("hono/aws-lambda").LambdaContext) => Promise<import("hono/aws-lambda").APIGatewayProxyResult & (L extends {
    multiValueHeaders: Record<string, string[]>;
} ? {
    headers?: undefined;
    multiValueHeaders: Record<string, string[]>;
} : {
    headers: Record<string, string>;
    multiValueHeaders?: undefined;
})>;
//# sourceMappingURL=worker.d.ts.map