import * as cdk from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment';
import { Construct } from 'constructs';
import { AmplifyConfigGenerator } from './amplify-config-generator';
import { writeFileSync } from 'fs';
import * as path from 'path';

export class TimeTrackingStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // DynamoDB Table for Time Records
    const timeRecordsTable = new dynamodb.Table(this, 'TimeRecordsTable', {
      tableName: 'TimeRecords',
      partitionKey: {
        name: 'PK',
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: 'SK',
        type: dynamodb.AttributeType.STRING,
      },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY, // For development
    });

    // Global Secondary Index for project-based queries
    timeRecordsTable.addGlobalSecondaryIndex({
      indexName: 'GSI1',
      partitionKey: {
        name: 'GSI1PK',
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: 'GSI1SK',
        type: dynamodb.AttributeType.STRING,
      },
    });

    // Cognito User Pool
    const userPool = new cognito.UserPool(this, 'TimeTrackingUserPool', {
      userPoolName: 'TimeTrackingUsers',
      selfSignUpEnabled: true,
      signInAliases: {
        email: true,
      },
      autoVerify: {
        email: true,
      },
      standardAttributes: {
        email: {
          required: true,
          mutable: true,
        },
        givenName: {
          required: false,
          mutable: true,
        },
        familyName: {
          required: false,
          mutable: true,
        },
      },
      customAttributes: {
        'timezone': new cognito.StringAttribute({ minLen: 1, maxLen: 50, mutable: true }),
        'preferences': new cognito.StringAttribute({ minLen: 1, maxLen: 1000, mutable: true }),
      },
      passwordPolicy: {
        minLength: 8,
        requireLowercase: true,
        requireUppercase: true,
        requireDigits: true,
        requireSymbols: false,
      },
      accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
      userVerification: {
        emailSubject: 'Time Tracker - Verify your email',
        emailBody: 'Welcome to Time Tracker! Please verify your email by clicking this link: {##Verify Email##}',
        emailStyle: cognito.VerificationEmailStyle.LINK,
      },
      userInvitation: {
        emailSubject: 'Welcome to Time Tracker',
        emailBody: 'Welcome to Time Tracker! Your username is {username} and temporary password is {####}',
      },
      signInCaseSensitive: false,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // Cognito User Pool Client
    const userPoolClient = new cognito.UserPoolClient(this, 'TimeTrackingUserPoolClient', {
      userPool,
      userPoolClientName: 'TimeTrackingWebClient',
      authFlows: {
        adminUserPassword: true,
        userPassword: true,
        userSrp: true,
        custom: true,
      },
      generateSecret: false,
      refreshTokenValidity: cdk.Duration.days(30),
      accessTokenValidity: cdk.Duration.hours(1),
      idTokenValidity: cdk.Duration.hours(1),
      enableTokenRevocation: true,
      preventUserExistenceErrors: true,
      supportedIdentityProviders: [
        cognito.UserPoolClientIdentityProvider.COGNITO,
      ],
      oAuth: {
        flows: {
          authorizationCodeGrant: true,
          implicitCodeGrant: false,
        },
        scopes: [
          cognito.OAuthScope.EMAIL,
          cognito.OAuthScope.OPENID,
          cognito.OAuthScope.PROFILE,
        ],
        // Initial callback URLs - will be updated after CloudFront is created
        callbackUrls: [
          'http://localhost:3001/', // Local development
        ],
        logoutUrls: [
          'http://localhost:3001/', // Local development
        ],
      },
      readAttributes: new cognito.ClientAttributes()
        .withStandardAttributes({
          email: true,
          emailVerified: true,
          givenName: true,
          familyName: true,
        })
        .withCustomAttributes('timezone', 'preferences'),
      writeAttributes: new cognito.ClientAttributes()
        .withStandardAttributes({
          email: true,
          givenName: true,
          familyName: true,
        })
        .withCustomAttributes('timezone', 'preferences'),
    });

    // Cognito User Pool Domain for OAuth flows
    const userPoolDomain = new cognito.UserPoolDomain(this, 'TimeTrackingUserPoolDomain', {
      userPool,
      cognitoDomain: {
        domainPrefix: `time-tracking-${this.account}-${this.region}`,
      },
    });

    // Lambda function for API handlers
    const apiHandler = new lambda.Function(this, 'TimeTrackingApiHandler', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromInline(`
        exports.handler = async (event) => {
          console.log('Event:', JSON.stringify(event, null, 2));
          
          const response = {
            statusCode: 200,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*',
              'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
              'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
            },
            body: JSON.stringify({
              message: 'Time Tracking API - Setup Complete',
              path: event.path,
              method: event.httpMethod
            })
          };
          
          return response;
        };
      `),
      environment: {
        TABLE_NAME: timeRecordsTable.tableName,
        USER_POOL_ID: userPool.userPoolId,
        USER_POOL_CLIENT_ID: userPoolClient.userPoolClientId,
        USER_POOL_DOMAIN: userPoolDomain.domainName,
        REGION: this.region,
      },
    });

    // Grant DynamoDB permissions to Lambda
    timeRecordsTable.grantReadWriteData(apiHandler);

    // API Gateway
    const api = new apigateway.RestApi(this, 'TimeTrackingApi', {
      restApiName: 'Time Tracking API',
      description: 'API for time tracking application',
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: [
          'Content-Type',
          'X-Amz-Date',
          'Authorization',
          'X-Api-Key',
          'X-Amz-Security-Token',
        ],
      },
    });

    // API Gateway Integration
    const lambdaIntegration = new apigateway.LambdaIntegration(apiHandler);

    // API Routes
    const apiResource = api.root.addResource('api');
    
    // Time Records routes
    const timeRecordsResource = apiResource.addResource('time-records');
    timeRecordsResource.addMethod('GET', lambdaIntegration);
    timeRecordsResource.addMethod('POST', lambdaIntegration);
    
    const timeRecordResource = timeRecordsResource.addResource('{id}');
    timeRecordResource.addMethod('GET', lambdaIntegration);
    timeRecordResource.addMethod('PUT', lambdaIntegration);
    timeRecordResource.addMethod('DELETE', lambdaIntegration);

    // Projects routes
    const projectsResource = apiResource.addResource('projects');
    projectsResource.addMethod('GET', lambdaIntegration);
    
    const suggestionsResource = projectsResource.addResource('suggestions');
    suggestionsResource.addMethod('GET', lambdaIntegration);

    // Statistics routes
    const statsResource = apiResource.addResource('stats');
    statsResource.addMethod('GET', lambdaIntegration);

    // S3 Bucket for frontend hosting
    const websiteBucket = new s3.Bucket(this, 'TimeTrackingWebsite', {
      bucketName: `time-tracking-website-${this.account}-${this.region}`,
      websiteIndexDocument: 'index.html',
      websiteErrorDocument: 'index.html',
      publicReadAccess: true,
      blockPublicAccess: new s3.BlockPublicAccess({
        blockPublicAcls: false,
        blockPublicPolicy: false,
        ignorePublicAcls: false,
        restrictPublicBuckets: false,
      }),
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    // CloudFront Distribution
    const distribution = new cloudfront.Distribution(this, 'TimeTrackingDistribution', {
      defaultBehavior: {
        origin: origins.S3BucketOrigin.withOriginAccessControl(websiteBucket),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      },
      defaultRootObject: 'index.html',
      errorResponses: [
        {
          httpStatus: 404,
          responseHttpStatus: 200,
          responsePagePath: '/index.html',
        },
      ],
    });

    // Update OAuth URLs to use CloudFront domain
    const cloudfrontDomain = `https://${distribution.distributionDomainName}`;
    
    // Create Identity Pool for AWS credentials
    const identityPool = new cognito.CfnIdentityPool(this, 'TimeTrackingIdentityPool', {
      identityPoolName: 'TimeTrackingIdentityPool',
      allowUnauthenticatedIdentities: false,
      cognitoIdentityProviders: [
        {
          clientId: userPoolClient.userPoolClientId,
          providerName: userPool.userPoolProviderName,
        },
      ],
    });

    // Create roles for authenticated users
    const authenticatedRole = new iam.Role(this, 'CognitoAuthenticatedRole', {
      assumedBy: new iam.FederatedPrincipal(
        'cognito-identity.amazonaws.com',
        {
          StringEquals: {
            'cognito-identity.amazonaws.com:aud': identityPool.ref,
          },
          'ForAnyValue:StringLike': {
            'cognito-identity.amazonaws.com:amr': 'authenticated',
          },
        },
        'sts:AssumeRoleWithWebIdentity'
      ),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonCognitoPowerUser'),
      ],
    });

    // Attach the role to the identity pool
    new cognito.CfnIdentityPoolRoleAttachment(this, 'IdentityPoolRoleAttachment', {
      identityPoolId: identityPool.ref,
      roles: {
        authenticated: authenticatedRole.roleArn,
      },
    });

    // Generate Amplify configuration and deploy website
    const configGenerator = new AmplifyConfigGenerator({
      userPool,
      userPoolClient,
      userPoolDomain,
      identityPool,
      distribution,
      websiteBucket,
      region: this.region,
    });

    // Simple deployment without config generation
    const deployment = new s3deploy.BucketDeployment(this, 'DeployWebsite', {
      sources: [s3deploy.Source.asset(path.join(__dirname, '../../frontend/dist'))],
      destinationBucket: websiteBucket,
      distribution: distribution,
      distributionPaths: ['/*']
    });

    // Outputs
    new cdk.CfnOutput(this, 'ApiUrl', {
      value: api.url,
      description: 'API Gateway URL',
    });

    new cdk.CfnOutput(this, 'UserPoolId', {
      value: userPool.userPoolId,
      description: 'Cognito User Pool ID',
    });

    new cdk.CfnOutput(this, 'UserPoolClientId', {
      value: userPoolClient.userPoolClientId,
      description: 'Cognito User Pool Client ID',
    });

    new cdk.CfnOutput(this, 'IdentityPoolId', {
      value: identityPool.ref,
      description: 'Cognito Identity Pool ID',
    });

    new cdk.CfnOutput(this, 'UserPoolDomain', {
      value: userPoolDomain.domainName,
      description: 'Cognito User Pool Domain',
    });

    new cdk.CfnOutput(this, 'UserPoolRegion', {
      value: this.region,
      description: 'AWS Region for Cognito User Pool',
    });

    new cdk.CfnOutput(this, 'WebsiteUrl', {
      value: `https://${distribution.distributionDomainName}`,
      description: 'CloudFront Distribution URL',
    });

    new cdk.CfnOutput(this, 'S3BucketName', {
      value: websiteBucket.bucketName,
      description: 'S3 Bucket Name for website hosting',
    });

    // Complete Amplify Outputs JSON
    new cdk.CfnOutput(this, 'AmplifyOutputsJson', {
      value: JSON.stringify({
        version: "1",
        auth: {
          aws_region: this.region,
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
            domain: `${userPoolDomain.domainName}.auth.${this.region}.amazoncognito.com`,
            scopes: ["email", "openid", "profile"],
            redirect_sign_in_uri: [
              "http://localhost:3001/",
              `https://${distribution.distributionDomainName}/`
            ],
            redirect_sign_out_uri: [
              "http://localhost:3001/",
              `https://${distribution.distributionDomainName}/`
            ],
            response_type: "code"
          },
          username_attributes: ["email"],
          user_verification_types: ["email"]
        }
      }, null, 2),
      description: 'Complete amplify_outputs.json configuration - copy this to frontend/public/amplify_outputs.json',
    });
  }
}