#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";
import { SmartVaultStack } from "../lib/smart-vault-stack";
import { SmartVaultS3Stack } from "../lib/smart-vault-s3-stack";

const app = new cdk.App();
const primaryStack = new SmartVaultStack(app, "SmartVaultStack", {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
});

const s3Stack = new SmartVaultS3Stack(app, "SmartVaultS3Stack", {
  env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: "us-east-2" },
});

primaryStack.addDependency(s3Stack);
