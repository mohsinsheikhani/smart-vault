import {
  EC2Client,
  DescribeInstancesCommand,
  CreateSnapshotCommand,
  DeleteSnapshotCommand,
  DescribeSnapshotsCommand,
} from "@aws-sdk/client-ec2";
import { SNSClient, PublishCommand } from "@aws-sdk/client-sns";

const ec2 = new EC2Client({});
const sns = new SNSClient({});

const SNS_TOPIC_ARN = process.env.SNS_TOPIC_ARN;
const RETENTION_DAYS = 7;

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

    for (const reservation of instancesData.Reservations || []) {
      for (const instance of reservation.Instances || []) {
        console.log(
          `📌 Creating snapshot for instance: ${instance.InstanceId}`
        );

        const volumeId = instance.BlockDeviceMappings?.[0]?.Ebs?.VolumeId;
        if (volumeId) {
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

    // Send SNS notification
    if (snapshotIds.length > 0) {
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
