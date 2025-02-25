const AWS = require("aws-sdk");

const ec2 = new AWS.EC2();
const sns = new AWS.SNS();

const SNS_TOPIC_ARN = process.env.SNS_TOPIC_ARN;

// Keep snapshots for 7 days
const RETENTION_DAYS = 7;

exports.handler = async () => {
  try {
    console.log("Finding EC2 instances with Backup: True tag...");

    // 1. Find all EC2 instances with the Backup: True tag
    const instances = await ec2
      .describeInstances({
        Filters: [{ Name: "tag:Backup", Values: ["True"] }],
      })
      .promise();

    let snapshotIds = [];

    for (const reservation of instances.Reservations) {
      for (const instance of reservation.Instances) {
        console.log(
          `📌 Creating snapshot for instance: ${instance.InstanceId}`
        );

        // 2. Create a snapshot for each instance's root volume
        const volumeId = instance.BlockDeviceMappings[0]?.Ebs?.VolumeId;
        if (volumeId) {
          const snapshot = await ec2
            .createSnapshot({
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
            .promise();

          snapshotIds.push(snapshot.SnapshotId);
          console.log(`Snapshot Created: ${snapshot.SnapshotId}`);
        }
      }
    }

    // 3. Delete old snapshots beyond retention period
    console.log("Cleaning up old snapshots...");
    const snapshots = await ec2
      .describeSnapshots({
        Filters: [{ Name: "tag-key", Values: ["BackupDate"] }],
      })
      .promise();

    for (const snapshot of snapshots.Snapshots) {
      const snapshotDate = new Date(snapshot.StartTime);
      const ageInDays = (Date.now() - snapshotDate) / (1000 * 60 * 60 * 24);

      if (ageInDays > RETENTION_DAYS) {
        await ec2.deleteSnapshot({ SnapshotId: snapshot.SnapshotId }).promise();
        console.log(`Deleted old snapshot: ${snapshot.SnapshotId}`);
      }
    }

    // Send SNS notification
    await sns
      .publish({
        TopicArn: SNS_TOPIC_ARN,
        Subject: "EBS Backup Completed",
        Message: `Successfully created ${snapshotIds.length} snapshots.`,
      })
      .promise();

    return {
      statusCode: 200,
      body: JSON.stringify({ message: "Backup Completed" }),
    };
  } catch (error) {
    console.error("Backup failed:", error);
    await sns
      .publish({
        TopicArn: SNS_TOPIC_ARN,
        Subject: "EBS Backup Failed",
        Message: `Error: ${error.message}`,
      })
      .promise();
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Backup Failed" }),
    };
  }
};
