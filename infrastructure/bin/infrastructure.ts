#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import { TimeTrackingStack } from '../lib/time-tracking-stack';

const app = new cdk.App();
const stage = app.node.tryGetContext('stage') || 'dev';
const environments = app.node.tryGetContext('environments');
const envConfig = environments?.[stage];

if (!envConfig) {
  throw new Error(`Environment configuration not found for stage: ${stage}`);
}

// Map string cache policy to actual policy
const cachePolicy = envConfig.cachePolicy === 'CACHING_DISABLED' 
  ? cloudfront.CachePolicy.CACHING_DISABLED
  : cloudfront.CachePolicy.CACHING_OPTIMIZED;

new TimeTrackingStack(app, 'TimeTrackingStack', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT || envConfig.account,
    region: process.env.CDK_DEFAULT_REGION || envConfig.region
  },
  cachePolicy,
  allowedOrigins: envConfig.allowedOrigins
});