import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as s3 from "aws-cdk-lib/aws-s3";

export class SmartVaultS3Stack extends cdk.Stack {
  public readonly snapshotBucket: s3.Bucket;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    this.snapshotBucket = new s3.Bucket(this, "SnapshotStorageBucket", {
      bucketName: `smartvault-snapshots-${cdk.Aws.ACCOUNT_ID}`,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      lifecycleRules: [{ expiration: cdk.Duration.days(30) }],
    });

    new cdk.CfnOutput(this, "SnapshotS3BucketName", {
      value: this.snapshotBucket.bucketName,
    });
  }
}
