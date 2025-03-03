# Smart Vault: Automated EBS Backup & Retention

## Overview

Smart Vault is a serverless solution that automates EBS snapshot creation, retention, and monitoring using AWS CDK. This solution ensures backup consistency, enforces retention policies, and provides real-time monitoring with alerts.

## Architecture

![Smart Vault Architecture](https://github.com/user-attachments/assets/2958b3e0-f0d8-4d89-b036-f387628896d8)


### Workflow

1. **Amazon EventBridge** triggers an **AWS Lambda** function based on a predefined schedule.
2. The Lambda function:
   - Identifies EC2 instances with the `Backup=True` tag.
   - Creates EBS snapshots.
   - Applies retention policies.
   - Pushes backup metrics to Amazon CloudWatch.
3. CloudWatch alarms monitor the backup process and trigger notifications via **Amazon SNS**.
4. **Cross-Region Snapshot Copy** ensures disaster recovery readiness.

## Tech Stack

- **AWS CDK (TypeScript)** – Infrastructure as Code
- **Amazon EventBridge** – Event-driven automation
- **AWS Lambda** – Serverless execution
- **Amazon EBS Snapshots** – Data backup
- **Amazon CloudWatch** – Monitoring & alerts
- **Amazon SNS** – Notifications (e.g., Slack)

## Deployment

### Prerequisites

- Install [AWS CDK](https://docs.aws.amazon.com/cdk/latest/guide/getting_started.html)
- Configure AWS credentials

### Steps

```sh
# Clone the repository
git clone https://github.com/mohsinsheikhani/smart-vault.git
cd smart-vault

# Install dependencies
npm install

# Bootstrap AWS CDK (if not done already)
cdk bootstrap

# Deploy the stack
cdk deploy
```

## Configuration

Modify `cdk.json` or `lib/config.ts` to customize settings such as:

- Snapshot retention period
- Backup tagging strategy
- Notification channels

## Monitoring

- Check **CloudWatch Logs** for Lambda execution details.
- Review **CloudWatch Metrics** for backup success rates.
- Set up **SNS Alerts** for failure notifications.

## Cleanup

To remove the stack:

```sh
cdk destroy
```
