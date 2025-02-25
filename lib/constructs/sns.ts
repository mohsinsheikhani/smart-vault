import { Construct } from "constructs";
import * as sns from "aws-cdk-lib/aws-sns";

export class SNSResource extends Construct {
  public readonly backupAlertTopic: sns.Topic;

  constructor(scope: Construct, id: string) {
    super(scope, id);

    this.backupAlertTopic = new sns.Topic(this, "BackupAlertTopic");
  }
}
