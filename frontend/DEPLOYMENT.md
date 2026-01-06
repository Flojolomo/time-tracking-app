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
After building, inject the AWS configuration:

```bash
npm run configure-deployment '{"userPoolId":"us-east-1_abc123","userPoolWebClientId":"abc123","region":"us-east-1"}'
```

Or use the Node.js API:
```javascript
const { configureDeployment } = require('./scripts/configure-deployment.js');

configureDeployment({
  region: 'us-east-1',
  userPoolId: 'us-east-1_abc123',
  userPoolWebClientId: 'abc123def456',
  cognitoDomain: 'your-app.auth.us-east-1.amazoncognito.com',
  apiEndpoint: 'https://api.your-domain.com',
  redirectSignIn: 'https://your-domain.com/',
  redirectSignOut: 'https://your-domain.com/'
});
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
import { execSync } from 'child_process';
import * as path from 'path';

// After creating your Cognito User Pool and other resources
const deployment = new BucketDeployment(this, 'DeployWebsite', {
  sources: [
    Source.asset(path.join(__dirname, '../frontend/dist'), {
      bundling: {
        image: DockerImage.fromRegistry('node:18'),
        command: [
          'bash', '-c', [
            'cp -r /asset-input/* /asset-output/',
            `node /asset-input/scripts/configure-deployment.js '${JSON.stringify({
              region: this.region,
              userPoolId: userPool.userPoolId,
              userPoolWebClientId: userPoolClient.userPoolClientId,
              cognitoDomain: `${userPoolDomain.domainName}.auth.${this.region}.amazoncognito.com`,
              apiEndpoint: api.url,
              redirectSignIn: `https://${distribution.distributionDomainName}/`,
              redirectSignOut: `https://${distribution.distributionDomainName}/`
            })}'`
          ].join(' && ')
        ]
      }
    })
  ],
  destinationBucket: websiteBucket,
  distribution: cloudFrontDistribution,
  distributionPaths: ['/*']
});
```

## Configuration File Structure

The `public/config.js` file serves as a template:

```javascript
window.__AWS_CONFIG__ = {
  region: '${AWS_REGION}',
  userPoolId: '${COGNITO_USER_POOL_ID}',
  userPoolWebClientId: '${COGNITO_USER_POOL_CLIENT_ID}',
  cognitoDomain: '${COGNITO_DOMAIN}',
  apiEndpoint: '${API_ENDPOINT}',
  redirectSignIn: '${REDIRECT_SIGN_IN}',
  redirectSignOut: '${REDIRECT_SIGN_OUT}'
};
```

The deployment script replaces `${VARIABLE}` placeholders with actual values.

## Verification

After deployment, verify the configuration by:

1. Opening the deployed website
2. Checking browser console for configuration warnings
3. Testing the authentication flow
4. Verifying API calls work correctly

## Troubleshooting

### Configuration Not Loading
- Check that `config.js` exists in the deployed S3 bucket
- Verify the configuration values were properly injected
- Ensure CloudFront cache is invalidated after deployment

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