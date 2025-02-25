import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as lambda from "aws-cdk-lib/aws-lambda";
import {
  NodejsFunction,
  NodejsFunctionProps,
} from "aws-cdk-lib/aws-lambda-nodejs";
import * as path from "path";
import * as events from "aws-cdk-lib/aws-events";
import * as eventsTargets from "aws-cdk-lib/aws-events-targets";
import * as iam from "aws-cdk-lib/aws-iam";

import { Topic } from "aws-cdk-lib/aws-sns";

export interface LambdaProps {
  backupAlertTopic: Topic;
}

export class LambdaResource extends Construct {
  constructor(scope: Construct, id: string, props: LambdaProps) {
    super(scope, id);

    const nodeJsFunctionProps: NodejsFunctionProps = {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: "handler",
      entry: path.join(__dirname, "../../lambda/backup-lambda/index.js"),
      timeout: cdk.Duration.seconds(30),
      environment: {
        SNS_TOPIC_ARN: props.backupAlertTopic.topicArn,
      },
      bundling: {
        nodeModules: ["@aws-sdk/client-ec2", "@aws-sdk/client-sns"],
      },
    };

    const backupLambda = new NodejsFunction(this, "BackupLambda", {
      ...nodeJsFunctionProps,
    });

    props.backupAlertTopic.grantPublish(backupLambda);

    backupLambda.addToRolePolicy(
      new iam.PolicyStatement({
        actions: [
          "ec2:DescribeInstances",
          "ec2:CreateSnapshot",
          "ec2:DescribeSnapshots",
          "ec2:DeleteSnapshot",
          "ec2:CreateTags",
        ],
        resources: ["*"],
      })
    );

    new events.Rule(this, "DailyBackupRule", {
      schedule: events.Schedule.cron({ minute: "0/5", hour: "*" }),
      targets: [new eventsTargets.LambdaFunction(backupLambda)],
    });
  }
}
