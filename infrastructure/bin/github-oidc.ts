#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { GitHubOidcStack } from '../lib/github-oidc-stack';

const app = new cdk.App();

// Get configuration from context or environment variables
const githubOrg = app.node.tryGetContext('github-org') || process.env.GITHUB_ORG || 'your-github-org';
const githubRepo = app.node.tryGetContext('github-repo') || process.env.GITHUB_REPO || 'time-tracking-app';
const githubRepository = `${githubOrg}/${githubRepo}`;
const mainStackName = app.node.tryGetContext('main-stack-name') || process.env.MAIN_STACK_NAME || 'TimeTrackingStack';

new GitHubOidcStack(app, 'GitHubOidcStack', {
  githubRepository,
  githubOrg,
  mainStackName,
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
  description: `GitHub OIDC authentication infrastructure for ${githubRepository}`,
});