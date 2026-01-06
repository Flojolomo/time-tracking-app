import * as cdk from 'aws-cdk-lib';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as path from 'path';

export interface AmplifyConfigGeneratorProps {
  userPool: cognito.UserPool;
  userPoolClient: cognito.UserPoolClient;
  userPoolDomain: cognito.UserPoolDomain;
  identityPool: cognito.CfnIdentityPool;
  distribution: cloudfront.Distribution;
  websiteBucket: s3.Bucket;
  region: string;
}

export class AmplifyConfigGenerator {
  constructor(private props: AmplifyConfigGeneratorProps) {}

  /**
   * Create BucketDeployment with bundling that generates config at deployment time
   */
  createDeploymentWithConfig(
    scope: cdk.Stack,
    websiteBucket: s3.Bucket,
    distribution: cloudfront.Distribution
  ): s3deploy.BucketDeployment {
    
    const { userPool, userPoolClient, userPoolDomain, identityPool, region } = this.props;
    
    return new s3deploy.BucketDeployment(scope, 'DeployWebsiteWithConfig', {
      sources: [
        s3deploy.Source.asset(path.join(__dirname, '../../frontend'), {
          bundling: {
            image: cdk.DockerImage.fromRegistry('node:18-alpine'),
            command: [
              'sh', '-c', [
                // Install dependencies and build
                'npm ci',
                'npm run build',
                
                // Generate the amplify_outputs.json with resolved values
                // We'll use environment variables to pass the resolved values
                'cat > dist/amplify_outputs.json << EOF',
                JSON.stringify({
                  Auth: {
                    Cognito: {
                      userPoolId: "REPLACE_USER_POOL_ID",
                      userPoolClientId: "REPLACE_USER_POOL_CLIENT_ID",
                      identityPoolId: "REPLACE_IDENTITY_POOL_ID",
                      loginWith: {
                        oauth: {
                          domain: "REPLACE_DOMAIN.auth." + region + ".amazoncognito.com",
                          scopes: ['openid', 'email', 'profile'],
                          redirectSignIn: [
                            'http://localhost:3001/',
                            'https://REPLACE_CLOUDFRONT_DOMAIN/'
                          ],
                          redirectSignOut: [
                            'http://localhost:3001/',
                            'https://REPLACE_CLOUDFRONT_DOMAIN/'
                          ],
                          responseType: 'code'
                        },
                        email: true,
                        username: false
                      },
                      signUpVerificationMethod: 'code',
                      userAttributes: {
                        email: {
                          required: true
                        }
                      },
                      allowGuestAccess: false,
                      passwordFormat: {
                        minLength: 8,
                        requireLowercase: true,
                        requireUppercase: true,
                        requireNumbers: true,
                        requireSpecialCharacters: false
                      }
                    }
                  }
                }, null, 2),
                'EOF',
                
                // Replace placeholders with actual values using environment variables
                `sed -i "s/REPLACE_USER_POOL_ID/$USER_POOL_ID/g" dist/amplify_outputs.json`,
                `sed -i "s/REPLACE_USER_POOL_CLIENT_ID/$USER_POOL_CLIENT_ID/g" dist/amplify_outputs.json`,
                `sed -i "s/REPLACE_IDENTITY_POOL_ID/$IDENTITY_POOL_ID/g" dist/amplify_outputs.json`,
                `sed -i "s/REPLACE_DOMAIN/$USER_POOL_DOMAIN/g" dist/amplify_outputs.json`,
                `sed -i "s/REPLACE_CLOUDFRONT_DOMAIN/$CLOUDFRONT_DOMAIN/g" dist/amplify_outputs.json`,
                
                // Copy all files to output
                'cp -r dist/* /asset-output/'
              ].join(' && ')
            ],
            environment: {
              USER_POOL_ID: userPool.userPoolId,
              USER_POOL_CLIENT_ID: userPoolClient.userPoolClientId,
              IDENTITY_POOL_ID: identityPool.ref,
              USER_POOL_DOMAIN: userPoolDomain.domainName,
              CLOUDFRONT_DOMAIN: distribution.distributionDomainName
            },
            user: 'root'
          }
        })
      ],
      destinationBucket: websiteBucket,
      distribution: distribution,
      distributionPaths: ['/*']
    });
  }
}