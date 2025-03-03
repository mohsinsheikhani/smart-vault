import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import { SlackNotifierResource } from "./constructs/slack-notifier";
import { LambdaResource } from "./constructs/lambda";
import { MonitoringResource } from "./constructs/monitoring";

export class SmartVaultStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const { backupAlertTopic } = new SlackNotifierResource(
      this,
      "SlackNotifierResource"
    );

    const bucketName = `smartvault-snapshots-${cdk.Aws.ACCOUNT_ID}`;

    new LambdaResource(this, "BackupLambdaResource", {
      backupAlertTopic,
      bucketName,
    });

    new MonitoringResource(this, "Monitoring", backupAlertTopic);
  }
}
