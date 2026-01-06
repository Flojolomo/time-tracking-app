import * as cdk from 'aws-cdk-lib';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import { writeFileSync } from 'fs';
import { execSync } from 'child_process';
import * as path from 'path';

export interface AmplifyConfigGeneratorProps {
  userPool: cognito.UserPool;
  userPoolClient: cognito.UserPoolClient;
  userPoolDomain: cognito.UserPoolDomain;
  identityPool: cognito.CfnIdentityPool;
  distribution: cloudfront.Distribution;
  region: string;
}

export class AmplifyConfigGenerator {
  constructor(private props: AmplifyConfigGeneratorProps) {}

  /**
   * Generate the amplify_outputs.json configuration
   */
  generateConfig(): any {
    const { userPool, userPoolClient, userPoolDomain, identityPool, distribution, region } = this.props;
    
    // Get the CloudFront domain for OAuth redirects
    const cloudfrontDomain = `https://${distribution.distributionDomainName}`;
    
    return {
      version: "1",
      auth: {
        aws_region: region,
        user_pool_id: userPool.userPoolId,
        user_pool_client_id: userPoolClient.userPoolClientId,
        identity_pool_id: identityPool.ref,
        password_policy: {
          min_length: 8,
          require_lowercase: true,
          require_uppercase: true,
          require_numbers: true,
          require_symbols: false
        },
        oauth: {
          identity_providers: ["COGNITO"],
          domain: `${userPoolDomain.domainName}.auth.${region}.amazoncognito.com`,
          scopes: ["email", "openid", "profile"],
          redirect_sign_in_uri: [
            "http://localhost:3001/",  // Development
            `${cloudfrontDomain}/`     // Production
          ],
          redirect_sign_out_uri: [
            "http://localhost:3001/",  // Development
            `${cloudfrontDomain}/`     // Production
          ],
          response_type: "code"
        },
        username_attributes: ["email"],
        user_verification_types: ["email"]
      }
    };
  }

  /**
   * Create a simple BucketDeployment that deploys pre-built frontend
   */
  createDeployment(
    scope: cdk.Stack,
    websiteBucket: cdk.aws_s3.Bucket,
    distribution: cloudfront.Distribution
  ): s3deploy.BucketDeployment {
    
    // Generate the config and write it to the frontend dist folder
    const config = this.generateConfig();
    const frontendDistPath = path.join(__dirname, '../../frontend/dist');
    const configPath = path.join(frontendDistPath, 'amplify_outputs.json');
    
    // Write the configuration file
    writeFileSync(configPath, JSON.stringify(config, null, 2));
    
    return new s3deploy.BucketDeployment(scope, 'DeployWebsiteWithConfig', {
      sources: [s3deploy.Source.asset(frontendDistPath)],
      destinationBucket: websiteBucket,
      distribution: distribution,
      distributionPaths: ['/*']
    });
  }
}