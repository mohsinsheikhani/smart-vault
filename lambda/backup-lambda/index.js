import {
  EC2Client,
  DescribeInstancesCommand,
  CreateSnapshotCommand,
  DeleteSnapshotCommand,
  DescribeSnapshotsCommand,
  DescribeVolumesCommand,
  CopySnapshotCommand,
} from "@aws-sdk/client-ec2";
import { SNSClient, PublishCommand } from "@aws-sdk/client-sns";
import {
  CloudWatchClient,
  PutMetricDataCommand,
} from "@aws-sdk/client-cloudwatch";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const ec2 = new EC2Client({});
const sns = new SNSClient({});
const cloudwatch = new CloudWatchClient({});
const s3 = new S3Client({
  region: "us-east-2",
});

const SNS_TOPIC_ARN = process.env.SNS_TOPIC_ARN;
const S3_BUCKET_NAME = process.env.S3_BUCKET_NAME;
const SOURCE_REGION = process.env.SOURCE_REGION;
const DESTINATION_REGION = "us-east-2";
const RETENTION_DAYS = 7;

const ec2Dest = new EC2Client({ region: DESTINATION_REGION });

export const handler = async () => {
  try {
    console.log("Finding EC2 instances with Backup: True tag...");

    // 1. Find all EC2 instances with the Backup: True tag
    const instancesData = await ec2.send(
      new DescribeInstancesCommand({
        Filters: [{ Name: "tag:Backup", Values: ["True"] }],
      })
    );

    let snapshotIds = [];
    let totalStorageUsed = 0;

    for (const reservation of instancesData.Reservations || []) {
      for (const instance of reservation.Instances || []) {
        console.log(`Creating snapshot for instance: ${instance.InstanceId}`);

        const volumeId = instance.BlockDeviceMappings?.[0]?.Ebs?.VolumeId;
        if (volumeId) {
          const volumeDetails = await ec2.send(
            new DescribeVolumesCommand({ VolumeIds: [volumeId] })
          );
          const volumeSize = volumeDetails.Volumes[0]?.Size || 0;
          totalStorageUsed += volumeSize;

          const snapshot = await ec2.send(
            new CreateSnapshotCommand({
              VolumeId: volumeId,
              Description: `Backup for ${
                instance.InstanceId
              } - ${new Date().toISOString()}`,
              TagSpecifications: [
                {
                  ResourceType: "snapshot",
                  Tags: [
                    { Key: "InstanceId", Value: instance.InstanceId },
                    { Key: "BackupDate", Value: new Date().toISOString() },
                  ],
                },
              ],
            })
          );

          snapshotIds.push(snapshot.SnapshotId);

          console.log(`Snapshot Created: ${snapshot.SnapshotId}`);

          console.log(
            `Copying snapshot ${snapshot.SnapshotId} to ${DESTINATION_REGION}...`
          );

          await ec2Dest.send(
            new CopySnapshotCommand({
              SourceRegion: SOURCE_REGION,
              SourceSnapshotId: snapshot.SnapshotId,
              Description: `Cross-region backup of ${snapshot.SnapshotId}`,
            })
          );

          console.log(`Snapshot copied to ${DESTINATION_REGION}`);

          console.log(`Exporting snapshot ${snapshot.SnapshotId} to S3...`);

          await s3.send(
            new PutObjectCommand({
              Bucket: S3_BUCKET_NAME,
              Key: `snapshots/${snapshot.SnapshotId}.json`,
              Body: JSON.stringify({
                snapshotId: snapshot.SnapshotId,
                instanceId: instance.InstanceId,
                createdAt: new Date().toISOString(),
              }),
            })
          );

          console.log(`Snapshot metadata stored in S3`);
        }
      }
    }

    // 3. Delete old snapshots beyond retention period
    console.log("Cleaning up old snapshots...");
    const snapshotsData = await ec2.send(
      new DescribeSnapshotsCommand({
        Filters: [{ Name: "tag-key", Values: ["BackupDate"] }],
      })
    );

    for (const snapshot of snapshotsData.Snapshots || []) {
      const snapshotDate = new Date(snapshot.StartTime);
      const ageInDays = (Date.now() - snapshotDate) / (1000 * 60 * 60 * 24);

      if (ageInDays > RETENTION_DAYS) {
        await ec2.send(
          new DeleteSnapshotCommand({ SnapshotId: snapshot.SnapshotId })
        );
        console.log(`Deleted old snapshot: ${snapshot.SnapshotId}`);
      }
    }

    if (snapshotIds.length > 0) {
      // Push Metrics to CloudWatch
      console.log("Publishing CloudWatch Metrics...");
      await cloudwatch.send(
        new PutMetricDataCommand({
          Namespace: "SmartVault",
          MetricData: [
            {
              MetricName: "TotalSnapshots",
              Unit: "Count",
              Value: snapshotIds.length,
            },
            {
              MetricName: "TotalStorageUsed",
              Unit: "Gigabytes",
              Value: totalStorageUsed,
            },
          ],
        })
      );

      // Send SNS notification
      await sns.send(
        new PublishCommand({
          TopicArn: SNS_TOPIC_ARN,
          Subject: "EBS Backup Completed",
          Message: `Successfully created ${snapshotIds.length} snapshots.`,
        })
      );
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ message: "Backup Completed" }),
    };
  } catch (error) {
    console.error("Backup failed:", error);

    // Push Failure Metric to CloudWatch
    await cloudwatch.send(
      new PutMetricDataCommand({
        Namespace: "SmartVault",
        MetricData: [
          {
            MetricName: "BackupFailures",
            Unit: "Count",
            Value: 1,
          },
        ],
      })
    );

    await sns.send(
      new PublishCommand({
        TopicArn: SNS_TOPIC_ARN,
        Subject: "EBS Backup Failed",
        Message: `Error: ${error.message}`,
      })
    );

    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Backup Failed" }),
    };
  }
};
