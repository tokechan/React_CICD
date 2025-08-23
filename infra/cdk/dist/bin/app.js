#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("source-map-support/register");
const aws_cdk_lib_1 = require("aws-cdk-lib");
const frontend_stack_1 = require("../lib/frontend-stack");
const backend_stack_1 = require("../lib/backend-stack");
const app = new aws_cdk_lib_1.App();
new frontend_stack_1.FrontendStack(app, 'TodoAppFrontendStack', {
    env: {
        account: process.env.CDK_DEFAULT_ACCOUNT,
        region: process.env.CDK_DEFAULT_REGION,
    },
});
new backend_stack_1.BackendStack(app, 'TodoAppBackendStack', {
    env: {
        account: process.env.CDK_DEFAULT_ACCOUNT,
        region: process.env.CDK_DEFAULT_REGION,
    },
});
app.synth();
//# sourceMappingURL=app.js.map