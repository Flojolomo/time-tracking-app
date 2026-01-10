# GitHub OIDC Authentication Setup

This document explains how to set up GitHub OIDC authentication for secure AWS deployments without long-lived access keys.

## Overview

The GitHub OIDC stack creates:
- An OpenID Connect Identity Provider for GitHub Actions
- IAM roles for production and development deployments
- Proper permissions for CDK deployments and application management

**Location**: This OIDC infrastructure is part of the Time Tracking App project and should be deployed from the `infrastructure/` directory.

## Prerequisites

1. AWS CLI configured with appropriate permissions
2. CDK bootstrapped in your target AWS account/region
3. GitHub repository set up for the time tracking application
4. You should be in the `infrastructure/` directory when running these commands

## Deployment Steps

### 1. Navigate to Infrastructure Directory

```bash
cd infrastructure
```

### 2. Configure Repository Information

Set your GitHub repository information using one of these methods:

**Option A: Environment Variables**
```bash
export GITHUB_ORG="your-github-username-or-org"
export GITHUB_REPO="time-tracking-app"
export MAIN_STACK_NAME="TimeTrackingStack"
```

**Option B: CDK Context**
```bash
# Deploy with context parameters
npm run deploy:oidc -- -c github-org=your-github-username-or-org -c github-repo=time-tracking-app -c main-stack-name=TimeTrackingStack
```

**Option C: Use the Deployment Script (Recommended)**
```bash
# Simple deployment with defaults
./deploy-oidc.sh

# Or specify your repository details
./deploy-oidc.sh your-github-username-or-org time-tracking-app TimeTrackingStack
```

### 3. Deploy the OIDC Stack

**Manual Deployment:**
```bash
npm run deploy:oidc
```

**Or with custom parameters:**
```bash
npm run deploy:oidc -- -c github-org=your-github-username-or-org -c github-repo=time-tracking-app -c main-stack-name=TimeTrackingStack
```

This will create the OIDC provider and IAM roles in AWS.

### 4. Configure GitHub Repository

After deployment, you'll see outputs including a `GitHubActionsConfiguration` JSON. Use these values to configure your GitHub repository:

#### Required Repository Variables
Go to your GitHub repository → Settings → Secrets and variables → Actions → Variables:

- `AWS_REGION`: The AWS region (from output)
- `MAIN_STACK_NAME`: Your main application stack name
- `S3_BUCKET_NAME`: S3 bucket name for frontend deployment

#### Required Repository Secrets
Go to your GitHub repository → Settings → Secrets and variables → Actions → Secrets:

- `AWS_PRODUCTION_ROLE_ARN`: Production deployment role ARN
- `AWS_DEVELOPMENT_ROLE_ARN`: Development deployment role ARN

### 5. Set up GitHub Actions Workflow

Copy the example workflow to your repository:

```bash
# From your repository root (not the infrastructure directory)
mkdir -p .github/workflows
cp infrastructure/.github-workflows-example/deploy.yml .github/workflows/deploy.yml
```

### 6. Verify Setup

You can verify the setup by running:

```bash
# Check what will be deployed
npm run synth:oidc

# View differences
npm run diff:oidc
```

## Security Features

### Role Assumptions
The OIDC roles can only be assumed by:
- Main branch pushes (production role)
- Pull requests (development role)
- Specific environments (production/development)

### Permissions
The roles have:
- PowerUser access for AWS resource management
- Specific IAM permissions for CDK deployments
- S3 access for CDK assets and website deployment
- CloudFront permissions for cache invalidation
- CloudFormation permissions for stack management

### Session Duration
- Maximum session duration: 1 hour
- No long-lived credentials stored in GitHub

## Troubleshooting

### Common Issues

1. **"No credentials found" error in GitHub Actions**
   - Verify the role ARNs are correctly set in repository secrets
   - Check that the repository name matches exactly (case-sensitive)

2. **"Access denied" during deployment**
   - Ensure the OIDC stack is deployed first
   - Verify the GitHub repository name in the trust policy

3. **CDK bootstrap issues**
   - Make sure CDK is bootstrapped in your target account/region
   - The deployment role has permissions to access CDK assets bucket

### Debugging

To debug OIDC authentication issues:

1. Check the CloudTrail logs for AssumeRoleWithWebIdentity calls
2. Verify the GitHub token claims match the trust policy conditions
3. Ensure the OIDC provider thumbprints are current

## Stack Management

### Update the OIDC Stack
```bash
npm run deploy:oidc
```

### Remove the OIDC Stack
```bash
npm run destroy:oidc
```

**Warning**: Removing the OIDC stack will break GitHub Actions deployments until recreated.

## Integration with Main Application

The OIDC stack is designed to be deployed independently from the main application stack. This allows:

1. **Security isolation**: OIDC infrastructure managed separately
2. **Independent updates**: Update authentication without affecting the application
3. **Multiple environments**: Same OIDC setup can support multiple application environments

The main application stack (`TimeTrackingStack`) doesn't need to know about the OIDC setup - it's purely for GitHub Actions authentication.