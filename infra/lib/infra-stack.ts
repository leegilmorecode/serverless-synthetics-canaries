import * as cdk from '@aws-cdk/core';
import * as synthetics from '@aws-cdk/aws-synthetics';
import * as cloudwatch from '@aws-cdk/aws-cloudwatch';
import * as sns from '@aws-cdk/aws-sns';
import * as subscriptions from '@aws-cdk/aws-sns-subscriptions';
import * as actions from '@aws-cdk/aws-cloudwatch-actions';
import * as path from 'path';

export class InfraStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const topic = new sns.Topic(this, 'ActorsCanaryTopic', {
      displayName: 'Actors API Canary Topic',
      topicName: 'ActorsAPICanaryTopic',
      fifo: true,
    });
    topic.addSubscription(new subscriptions.EmailSubscription('lee.gilmore@gmail.com'));

    const actorsListCanary = new synthetics.Canary(this, 'ActorsListCanary', {
      schedule: synthetics.Schedule.rate(cdk.Duration.minutes(1)),
      test: synthetics.Test.custom({
        code: synthetics.Code.fromAsset(path.join(__dirname, '../canary')),
        handler: 'index.handler',
      }),
      runtime: synthetics.Runtime.SYNTHETICS_NODEJS_PUPPETEER_3_2,
      environmentVariables: {
        stage: process.env.STAGE || 'develop',
      },
    });

    const alarm = new cloudwatch.Alarm(this, 'ActorsListCanaryAlarm', {
      metric: actorsListCanary.metricSuccessPercent(), // percentage of successful canary runs over a given time
      evaluationPeriods: 1,
      threshold: 90,
      actionsEnabled: true,
      alarmDescription: 'Actors API Canary CloudWatch Alarm',
      alarmName: 'ActorsListCanaryAlarm',
      comparisonOperator: cloudwatch.ComparisonOperator.LESS_THAN_THRESHOLD,
    });

    alarm.addAlarmAction(new actions.SnsAction(topic));
  }
}
