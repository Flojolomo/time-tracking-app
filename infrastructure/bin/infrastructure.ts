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

// Create CORS configuration from environment config
const corsConfig = {
  allowCredentials: false,
  allowedOrigins: envConfig.allowedOrigins,
  allowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Amz-Date',
    'X-Api-Key',
    'X-Amz-Security-Token',
    'X-Amz-User-Agent',
    'X-Amz-Content-Sha256',
    'X-Amz-Target'
  ],
  maxAge: 86400
};

new TimeTrackingStack(app, 'TimeTrackingStack', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT || envConfig.account,
    region: process.env.CDK_DEFAULT_REGION || envConfig.region
  },
  cachePolicy,
  corsConfig
});