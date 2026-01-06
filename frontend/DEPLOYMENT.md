# Deployment Guide

This guide explains how to deploy the Time Tracking App frontend to AWS S3 as a static website using AWS Amplify Gen 2 configuration.

## Architecture

The frontend is designed to work as a static site hosted on S3 with CloudFront CDN. AWS configuration uses Amplify Gen 2 structure with `amplify_outputs.json` for runtime configuration.

## Development vs Production Configuration

### Development
- Uses `amplify_outputs.json` with placeholder values
- Configuration is loaded dynamically at runtime
- Suitable for local development with `npm run dev`

### Production (S3 Static Hosting)
- Uses the same `amplify_outputs.json` structure
- AWS values are injected into `amplify_outputs.json` during deployment
- No environment variables needed in the S3 environment

## Deployment Process

### 1. Build the Application
```bash
npm run build
```

This creates a `dist/` directory with the static files.

### 2. Configure AWS Values
After building, update the AWS configuration in `dist/amplify_outputs.json`:

```bash
# The CDK deployment process will update this file with actual AWS resource values
# This can be done as part of the BucketDeployment process
```

Example configuration that CDK will inject:
```json
{
  "version": "1",
  "auth": {
    "aws_region": "us-east-1",
    "user_pool_id": "us-east-1_abc123",
    "user_pool_client_id": "abc123def456",
    "identity_pool_id": "us-east-1:12345678-1234-1234-1234-123456789012",
    "password_policy": {
      "min_length": 8,
      "require_lowercase": true,
      "require_uppercase": true,
      "require_numbers": true,
      "require_symbols": true
    },
    "oauth": {
      "identity_providers": ["COGNITO"],
      "domain": "your-app.auth.us-east-1.amazoncognito.com",
      "scopes": ["email", "openid", "profile"],
      "redirect_sign_in_uri": ["https://your-domain.com/"],
      "redirect_sign_out_uri": ["https://your-domain.com/"],
      "response_type": "code"
    }
  }
}
```

### 3. Deploy to S3
Upload the `dist/` directory contents to your S3 bucket:

```bash
aws s3 sync dist/ s3://your-bucket-name --delete
```

## CDK Integration

For AWS CDK deployments, use this pattern in your CDK stack:

```typescript
import { BucketDeployment, Source } from 'aws-cdk-lib/aws-s3-deployment';
import { writeFileSync } from 'fs';
import * as path from 'path';

// After creating your Cognito User Pool and other resources
// Build the frontend first
execSync('npm run build', { cwd: path.join(__dirname, '../frontend') });

// Update amplify_outputs.json in the dist folder with deployed resource values
const amplifyConfig = {
  version: "1",
  auth: {
    aws_region: this.region,
    user_pool_id: userPool.userPoolId,
    user_pool_client_id: userPoolClient.userPoolClientId,
    identity_pool_id: identityPool.identityPoolId,
    password_policy: {
      min_length: 8,
      require_lowercase: true,
      require_uppercase: true,
      require_numbers: true,
      require_symbols: true
    },
    oauth: {
      identity_providers: ["COGNITO"],
      domain: `${userPoolDomain.domainName}.auth.${this.region}.amazoncognito.com`,
      scopes: ["email", "openid", "profile"],
      redirect_sign_in_uri: [`https://${distribution.distributionDomainName}/`],
      redirect_sign_out_uri: [`https://${distribution.distributionDomainName}/`],
      response_type: "code"
    }
  },
  data: {
    aws_region: this.region,
    url: api.url,
    default_authorization_type: "AMAZON_COGNITO_USER_POOLS"
  }
};

// Write the configuration to the built dist folder
const configPath = path.join(__dirname, '../frontend/dist/amplify_outputs.json');
writeFileSync(configPath, JSON.stringify(amplifyConfig, null, 2));

const deployment = new BucketDeployment(this, 'DeployWebsite', {
  sources: [Source.asset(path.join(__dirname, '../frontend/dist'))],
  destinationBucket: websiteBucket,
  distribution: cloudFrontDistribution,
  distributionPaths: ['/*']
});
```

## Configuration File Structure

The `amplify_outputs.json` file follows AWS Amplify Gen 2 structure:

```json
{
  "version": "1",
  "auth": {
    "aws_region": "us-east-1",
    "user_pool_id": "us-east-1_abc123",
    "user_pool_client_id": "abc123def456",
    "identity_pool_id": "us-east-1:12345678-1234-1234-1234-123456789012",
    "password_policy": {
      "min_length": 8,
      "require_lowercase": true,
      "require_uppercase": true,
      "require_numbers": true,
      "require_symbols": true
    },
    "oauth": {
      "identity_providers": ["COGNITO"],
      "domain": "your-app.auth.us-east-1.amazoncognito.com",
      "scopes": ["email", "openid", "profile"],
      "redirect_sign_in_uri": ["https://your-domain.com/"],
      "redirect_sign_out_uri": ["https://your-domain.com/"],
      "response_type": "code"
    },
    "username_attributes": ["email"],
    "user_verification_types": ["email"]
  },
  "data": {
    "aws_region": "us-east-1",
    "url": "https://api.your-domain.com/graphql",
    "api_key": "",
    "default_authorization_type": "AMAZON_COGNITO_USER_POOLS",
    "authorization_types": ["AMAZON_COGNITO_USER_POOLS"]
  },
  "storage": {
    "aws_region": "us-east-1",
    "bucket_name": "your-storage-bucket"
  }
}
```

The deployment process updates this file with actual AWS resource values.

## Verification

After deployment, verify the configuration by:

1. Opening the deployed website
2. Checking browser console for configuration warnings
3. Testing the authentication flow
4. Verifying API calls work correctly

## Troubleshooting

### Configuration Not Loading
- Check that `amplify_outputs.json` exists in the deployed S3 bucket
- Verify the configuration values were properly updated before deployment
- Ensure CloudFront cache is invalidated after deployment
- Check browser console for configuration validation warnings

### Authentication Errors
- Verify Cognito User Pool and Client IDs are correct
- Check that redirect URLs match the deployed domain
- Ensure CORS is properly configured on API Gateway

### Build Issues
- Run `npm run build` locally to test the build process
- Check that all required dependencies are installed
- Verify TypeScript compilation passes

## Security Considerations

- The configuration file contains public information only
- Sensitive values (like client secrets) should never be in the frontend
- Use Cognito's built-in security features for authentication
- Implement proper CORS policies on your API endpoints

## Performance Optimization

- Enable CloudFront compression
- Set appropriate cache headers for static assets
- Use CloudFront edge locations for global performance
- Consider implementing service worker for offline functionality