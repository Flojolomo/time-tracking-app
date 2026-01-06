#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { TimeTrackingStack } from '../lib/time-tracking-stack';

const app = new cdk.App();
new TimeTrackingStack(app, 'TimeTrackingStack', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
});