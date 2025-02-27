import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as cloudwatch from "aws-cdk-lib/aws-cloudwatch";
import * as sns from "aws-cdk-lib/aws-sns";
import * as cloudwatch_actions from "aws-cdk-lib/aws-cloudwatch-actions";

export class MonitoringResource extends Construct {
  constructor(scope: Construct, id: string, snsTopic: sns.Topic) {
    super(scope, id);

    // CloudWatch Alarm for High Snapshot Count (Indicating possible cost issues)
    const snapshotCountAlarm = new cloudwatch.Alarm(
      this,
      "SnapshotCountAlarm",
      {
        metric: new cloudwatch.Metric({
          namespace: "SmartVault",
          metricName: "TotalSnapshots",
          statistic: "Sum",
          period: cdk.Duration.hours(24),
        }),
        threshold: 1,
        evaluationPeriods: 1,
        comparisonOperator:
          cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
      }
    );

    // CloudWatch Alarm for High Storage Usage
    const storageUsageAlarm = new cloudwatch.Alarm(this, "StorageUsageAlarm", {
      metric: new cloudwatch.Metric({
        namespace: "SmartVault",
        metricName: "TotalStorageUsed",
        statistic: "Sum",
        period: cdk.Duration.hours(24),
      }),
      threshold: 500,
      evaluationPeriods: 1,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
    });

    // CloudWatch Alarm for Backup Failures
    const backupFailureAlarm = new cloudwatch.Alarm(
      this,
      "BackupFailureAlarm",
      {
        metric: new cloudwatch.Metric({
          namespace: "SmartVault",
          metricName: "BackupFailures",
          statistic: "Sum",
          period: cdk.Duration.minutes(5),
        }),
        threshold: 3,
        evaluationPeriods: 1,
        comparisonOperator:
          cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
      }
    );

    // Attach SNS Topic to Alarms
    snapshotCountAlarm.addAlarmAction(
      new cloudwatch_actions.SnsAction(snsTopic)
    );
    storageUsageAlarm.addAlarmAction(
      new cloudwatch_actions.SnsAction(snsTopic)
    );
    backupFailureAlarm.addAlarmAction(
      new cloudwatch_actions.SnsAction(snsTopic)
    );
  }
}
