import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import { SNSResource } from "./constructs/sns";
import { LambdaResource } from "./constructs/lambda";

export class SmartVaultStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const { backupAlertTopic } = new SNSResource(this, "SNSResource");

    new LambdaResource(this, "BackupLambdaResource", { backupAlertTopic });
  }
}
