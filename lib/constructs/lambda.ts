import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as lambda from "aws-cdk-lib/aws-lambda";
import {
  NodejsFunction,
  NodejsFunctionProps,
} from "aws-cdk-lib/aws-lambda-nodejs";
import * as path from "path";

export interface LambdaProps {
  topicArn: string;
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
        SNS_TOPIC_ARN: props.topicArn,
      },
      bundling: {
        externalModules: ["aws-sdk"],
        minify: true,
      },
    };

    new NodejsFunction(this, "BackupLambda", {
      ...nodeJsFunctionProps,
    });
  }
}
