import * as cdk from '@aws-cdk/core';
import * as iam from '@aws-cdk/aws-iam';
import * as synthetics from '@aws-cdk/aws-synthetics';
import * as s3 from '@aws-cdk/aws-s3';
import * as cloudwatch from '@aws-cdk/aws-cloudwatch';
import * as sns from '@aws-cdk/aws-sns';
import * as subscriptions from '@aws-cdk/aws-sns-subscriptions';
import * as actions from '@aws-cdk/aws-cloudwatch-actions';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(__dirname, '../.env') }); // read in the env vars from config

export class InfraStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const emailAddress = process.env.NOTIFICATION_EMAIL;
    const stage = process.env.STAGE;
    const apiUrl = process.env.APP_API_URL;
    const apiHost = process.env.APP_API_HOST;
    const apiProtocol = process.env.APP_API_PROTOCOL;
    const websiteUrl = process.env.WEBSITE_URL;

    if (!emailAddress || !stage || !apiUrl || !apiHost || !apiProtocol || !websiteUrl) {
      throw new Error('missing config');
    }

    const assetsBucket = new s3.Bucket(this, 'CanaryAssetsBucket', {
      bucketName: 'canary-assets-bucket',
      versioned: false,
      encryption: s3.BucketEncryption.S3_MANAGED,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    const apiTopic = new sns.Topic(this, 'ActorsCanaryAPITopic', {
      displayName: 'Actors API Canary Topic',
      topicName: 'ActorsAPICanaryTopic',
    });

    const visualTopic = new sns.Topic(this, 'ActorsCanaryVisualTopic', {
      displayName: 'Actors Visual Canary Topic',
      topicName: 'ActorsVisualCanaryTopic',
    });

    apiTopic.addSubscription(new subscriptions.EmailSubscription(emailAddress));
    visualTopic.addSubscription(new subscriptions.EmailSubscription(emailAddress));

    const canaryRole = new iam.Role(this, 'canary-iam-role', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      description: 'Canary IAM Role',
    });

    canaryRole.addToPolicy(
      new iam.PolicyStatement({
        resources: ['*'],
        actions: ['s3:ListAllMyBuckets'],
        effect: iam.Effect.ALLOW,
      }),
    );

    canaryRole.addToPolicy(
      new iam.PolicyStatement({
        resources: [`${assetsBucket.bucketArn}/*`],
        actions: ['kms:GenerateDataKey'],
        effect: iam.Effect.ALLOW,
      }),
    );

    canaryRole.addToPolicy(
      new iam.PolicyStatement({
        resources: [`${assetsBucket.bucketArn}/*`],
        actions: ['s3:*'],
        effect: iam.Effect.ALLOW,
      }),
    );

    canaryRole.addToPolicy(
      new iam.PolicyStatement({
        resources: ['*'],
        actions: ['cloudwatch:PutMetricData'],
        effect: iam.Effect.ALLOW,
        conditions: {
          StringEquals: {
            'cloudwatch:namespace': 'CloudWatchSynthetics',
          },
        },
      }),
    );

    canaryRole.addToPolicy(
      new iam.PolicyStatement({
        resources: ['arn:aws:logs:::*'],
        actions: ['logs:CreateLogStream', 'logs:CreateLogGroup', 'logs:PutLogEvents'],
        effect: iam.Effect.ALLOW,
      }),
    );

    const actorsListAPICanary = new synthetics.Canary(this, 'ActorsListAPICanary', {
      canaryName: 'actors-api-canary',
      role: canaryRole,
      schedule: synthetics.Schedule.rate(cdk.Duration.minutes(1)), // ensure it runs every minute
      artifactsBucketLocation: {
        bucket: assetsBucket,
      },
      test: synthetics.Test.custom({
        code: synthetics.Code.fromAsset(path.join(__dirname, '../canary')),
        handler: 'index.handler',
      }),
      runtime: synthetics.Runtime.SYNTHETICS_NODEJS_PUPPETEER_3_2,
      environmentVariables: {
        // pass through env vars to our lambda
        STAGE: stage,
        NOTIFICATION_EMAIL: emailAddress,
        APP_API_URL: apiUrl,
        APP_API_HOST: apiHost,
        APP_API_PROTOCOL: apiProtocol,
        WEBSITE_URL: websiteUrl,
      },
    });

    const actorsListVisualCanary = new synthetics.Canary(this, 'ActorsListVisualCanary', {
      canaryName: 'actors-visual-canary',
      role: canaryRole,
      schedule: synthetics.Schedule.rate(cdk.Duration.minutes(1)), // ensure it runs every minute
      artifactsBucketLocation: {
        bucket: assetsBucket,
      },
      test: synthetics.Test.custom({
        code: synthetics.Code.fromAsset(path.join(__dirname, '../visual-canary')),
        handler: 'index.handler',
      }),
      runtime: synthetics.Runtime.SYNTHETICS_NODEJS_PUPPETEER_3_2,
      environmentVariables: {
        // pass through env vars to our lambda
        STAGE: stage,
        NOTIFICATION_EMAIL: emailAddress,
        APP_API_URL: apiUrl,
        APP_API_HOST: apiHost,
        APP_API_PROTOCOL: apiProtocol,
        WEBSITE_URL: websiteUrl,
      },
    });

    const apiAlarm = new cloudwatch.Alarm(this, 'ActorsListAPICanaryAlarm', {
      metric: actorsListAPICanary.metricSuccessPercent(), // percentage of successful canary runs over a given time
      evaluationPeriods: 1,
      threshold: 90,
      actionsEnabled: true,
      alarmDescription: 'Actors API Canary CloudWatch Alarm',
      alarmName: 'ActorsListAPICanaryAlarm',
      comparisonOperator: cloudwatch.ComparisonOperator.LESS_THAN_THRESHOLD,
    });

    const visualAlarm = new cloudwatch.Alarm(this, 'ActorsListVisualCanaryAlarm', {
      metric: actorsListVisualCanary.metricSuccessPercent(), // percentage of successful canary runs over a given time
      evaluationPeriods: 1,
      threshold: 90,
      datapointsToAlarm: 1,
      actionsEnabled: true,
      alarmDescription: 'Actors Visual Canary CloudWatch Alarm',
      alarmName: 'ActorsListVisualCanaryAlarm',
      comparisonOperator: cloudwatch.ComparisonOperator.LESS_THAN_THRESHOLD,
    });

    apiAlarm.addAlarmAction(new actions.SnsAction(apiTopic));
    visualAlarm.addAlarmAction(new actions.SnsAction(visualTopic));
  }
}
