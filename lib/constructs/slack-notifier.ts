import { Construct } from "constructs";
import * as cdk from "aws-cdk-lib";
import * as sns from "aws-cdk-lib/aws-sns";
import * as lambda from "aws-cdk-lib/aws-lambda";
import {
  NodejsFunction,
  NodejsFunctionProps,
} from "aws-cdk-lib/aws-lambda-nodejs";
import * as sns_subscriptions from "aws-cdk-lib/aws-sns-subscriptions";
import * as path from "path";

export class SlackNotifierResource extends Construct {
  public readonly backupAlertTopic: sns.Topic;
  public readonly slackLambda: NodejsFunction;

  constructor(scope: Construct, id: string) {
    super(scope, id);

    this.backupAlertTopic = new sns.Topic(this, "BackupAlertTopic");

    const nodeJsFunctionProps: NodejsFunctionProps = {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: "handler",
      entry: path.join(__dirname, "../../lambda/slack-notifier/index.js"),
      timeout: cdk.Duration.seconds(30),
      environment: {
        SLACK_WEBHOOK_URL: process.env.SLACK_WEBHOOK_URL!,
      },
    };

    this.slackLambda = new NodejsFunction(this, "SlackNotifierLambda", {
      ...nodeJsFunctionProps,
    });

    this.backupAlertTopic.addSubscription(
      new sns_subscriptions.LambdaSubscription(this.slackLambda)
    );
  }
}
