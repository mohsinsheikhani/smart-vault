import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import { SlackNotifierResource } from "./constructs/slack-notifier";
import { LambdaResource } from "./constructs/lambda";

export class SmartVaultStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const { backupAlertTopic } = new SlackNotifierResource(
      this,
      "SlackNotifierResource"
    );

    new LambdaResource(this, "BackupLambdaResource", { backupAlertTopic });
  }
}
