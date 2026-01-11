import * as cdk from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as logs from 'aws-cdk-lib/aws-logs';
import { Construct } from 'constructs';

interface TimeTrackingStackProps extends cdk.StackProps {
/**
 * Cache policy used by CloudFront
 */
  cachePolicy: cloudfront.ICachePolicy;
  /**
   * Cache max age in seconds for response headers
   */
  cacheMaxAge?: number;
  /**
   * Complete CORS configuration for Lambda functions
   */
  corsConfig: {
    allowedOrigins: string[];
    allowCredentials: boolean;
    allowedMethods?: string[];
    allowedHeaders?: string[];
    maxAge?: number;
  };
}

export class TimeTrackingStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: TimeTrackingStackProps) {
    super(scope, id, props);

    // Create mutable copy of CORS config
    const corsConfig = { ...props.corsConfig };

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

    // S3 Bucket for frontend hosting (must be created before CloudFront)
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

    // Create response headers policy if cacheMaxAge is specified
    let responseHeadersPolicy: cloudfront.IResponseHeadersPolicy | undefined;
    if (props.cacheMaxAge) {
      responseHeadersPolicy = new cloudfront.ResponseHeadersPolicy(this, 'CachePolicy', {
        responseHeadersPolicyName: `time-tracking-cache-${this.node.tryGetContext('stage') || 'dev'}`,
        customHeadersBehavior: {
          customHeaders: [
            {
              header: 'cache-control',
              value: `public, max-age=${props.cacheMaxAge}`,
              override: true
            }
          ]
        }
      });
    }

    // CloudFront Function to handle SPA routing while preserving static asset requests
    const spaRoutingFunction = new cloudfront.Function(this, 'SpaRoutingFunction', {
      functionName: `time-tracking-spa-routing-${this.node.tryGetContext('stage') || 'dev'}`,
      code: cloudfront.FunctionCode.fromInline(`
function handler(event) {
    var request = event.request;
    var uri = request.uri;
    
    // If the URI has a file extension, serve it directly (don't fallback to index.html)
    if (uri.match(/\.[a-zA-Z0-9]+$/)) {
        return request;
    }
    
    // If no file extension and not root, it's a SPA route - serve index.html
    if (uri !== '/' && !uri.match(/\.[a-zA-Z0-9]+$/)) {
        request.uri = '/index.html';
    }
    
    return request;
}
      `),
    });

    // CloudFront Distribution
    const distribution = new cloudfront.Distribution(this, 'TimeTrackingDistribution', {
      defaultBehavior: {
        origin: origins.S3BucketOrigin.withOriginAccessControl(websiteBucket),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachePolicy: props.cachePolicy ?? cloudfront.CachePolicy.CACHING_OPTIMIZED,
        responseHeadersPolicy: responseHeadersPolicy,
        functionAssociations: [{
          function: spaRoutingFunction,
          eventType: cloudfront.FunctionEventType.VIEWER_REQUEST,
        }],
      },
      defaultRootObject: 'index.html',
      // Remove error responses since we're handling routing with the function
    });

    // Add CloudFront domain to CORS config
    corsConfig.allowedOrigins = [...corsConfig.allowedOrigins, `https://${distribution.distributionDomainName}`];

    // Lambda function for time records API
    const timeRecordsHandler = new lambda.Function(this, 'TimeRecordsApiHandler', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('lambda/timeRecords', {
        bundling: {
          image: lambda.Runtime.NODEJS_20_X.bundlingImage,
          local: {
            tryBundle(outputDir: string) {
              const { execSync } = require('child_process');
              execSync('npx esbuild src/index.ts --bundle --platform=node --target=node20 --external:@aws-sdk/* --outfile=' + outputDir + '/index.js', {
                cwd: 'lambda/timeRecords',
                stdio: 'inherit'
              });
              return true;
            }
          },
        },
      }),
      timeout: cdk.Duration.seconds(30),
      memorySize: 256,
      logRetention: logs.RetentionDays.ONE_WEEK,
      environment: {
        TABLE_NAME: timeRecordsTable.tableName,
        USER_POOL_ID: userPool.userPoolId,
        USER_POOL_CLIENT_ID: userPoolClient.userPoolClientId,
        USER_POOL_DOMAIN: userPoolDomain.domainName,
        REGION: this.region,
        CLOUDFRONT_DOMAIN: distribution.distributionDomainName,
        CORS_CONFIG: JSON.stringify(corsConfig)
      },
    });

    // Lambda function for projects API
    const projectsHandler = new lambda.Function(this, 'ProjectsApiHandler', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('lambda/projects', {
        bundling: {
          image: lambda.Runtime.NODEJS_20_X.bundlingImage,
          local: {
            tryBundle(outputDir: string) {
              const { execSync } = require('child_process');
              execSync('npx esbuild src/index.ts --bundle --platform=node --target=node20 --external:@aws-sdk/* --outfile=' + outputDir + '/index.js', {
                cwd: 'lambda/projects',
                stdio: 'inherit'
              });
              return true;
            }
          },
        },
      }),
      timeout: cdk.Duration.seconds(30),
      memorySize: 256,
      logRetention: logs.RetentionDays.ONE_WEEK,
      environment: {
        TABLE_NAME: timeRecordsTable.tableName,
        USER_POOL_ID: userPool.userPoolId,
        USER_POOL_CLIENT_ID: userPoolClient.userPoolClientId,
        USER_POOL_DOMAIN: userPoolDomain.domainName,
        REGION: this.region,
        CLOUDFRONT_DOMAIN: distribution.distributionDomainName,
        CORS_CONFIG: JSON.stringify(corsConfig)
      },
    });

    // Lambda function for profile management API
    const profileHandler = new lambda.Function(this, 'ProfileApiHandler', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('lambda/profile', {
        bundling: {
          image: lambda.Runtime.NODEJS_20_X.bundlingImage,
          local: {
            tryBundle(outputDir: string) {
              const { execSync } = require('child_process');
              execSync('npx esbuild src/index.ts --bundle --platform=node --target=node20 --external:@aws-sdk/* --outfile=' + outputDir + '/index.js', {
                cwd: 'lambda/profile',
                stdio: 'inherit'
              });
              return true;
            }
          },
        },
      }),
      timeout: cdk.Duration.seconds(30),
      memorySize: 256,
      logRetention: logs.RetentionDays.ONE_WEEK,
      environment: {
        TABLE_NAME: timeRecordsTable.tableName,
        USER_POOL_ID: userPool.userPoolId,
        USER_POOL_CLIENT_ID: userPoolClient.userPoolClientId,
        USER_POOL_DOMAIN: userPoolDomain.domainName,
        REGION: this.region,
        CLOUDFRONT_DOMAIN: distribution.distributionDomainName,
        CORS_CONFIG: JSON.stringify(corsConfig)
      },
    });

    // Grant DynamoDB permissions to Lambda functions
    timeRecordsTable.grantReadWriteData(timeRecordsHandler);
    timeRecordsTable.grantReadWriteData(projectsHandler);
    // Note: profileHandler no longer needs DynamoDB access - it delegates to timeRecordsHandler

    // Grant Lambda invocation permissions to profile handler
    profileHandler.addToRolePolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: ['lambda:InvokeFunction'],
      resources: [timeRecordsHandler.functionArn]
    }));

    // Add time records lambda name to profile handler environment
    profileHandler.addEnvironment('TIME_RECORDS_LAMBDA_NAME', timeRecordsHandler.functionName);

    // Grant Cognito permissions to profile handler
    profileHandler.addToRolePolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'cognito-idp:GetUser',
        'cognito-idp:UpdateUserAttributes',
        'cognito-idp:ChangePassword',
        'cognito-idp:ForgotPassword',
        'cognito-idp:ConfirmForgotPassword',
        'cognito-idp:DeleteUser',
        'cognito-idp:AdminDeleteUser',
        'cognito-idp:AdminGetUser'
      ],
      resources: [userPool.userPoolArn]
    }));

    // Create CloudWatch Log Group for API Gateway access logs
    const apiLogGroup = new logs.LogGroup(this, 'ApiGatewayAccessLogs', {
      logGroupName: '/aws/apigateway/time-tracking-api',
      retention: logs.RetentionDays.ONE_WEEK,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // API Gateway with optimized CORS to minimize preflight requests
    const api = new apigateway.RestApi(this, 'TimeTrackingApi', {
      restApiName: 'Time Tracking API',
      description: 'API for time tracking application',
      // Explicitly disable caching to prevent authorization issues
      policy: undefined,
      deployOptions: {
        accessLogDestination: new apigateway.LogGroupLogDestination(apiLogGroup),
        accessLogFormat: apigateway.AccessLogFormat.jsonWithStandardFields({
          caller: false,
          httpMethod: true,
          ip: false, // Don't log IP addresses for privacy
          protocol: true,
          requestTime: true,
          resourcePath: true,
          responseLength: true,
          status: true,
          user: false, // Don't log user info for privacy
        }),
        loggingLevel: apigateway.MethodLoggingLevel.ERROR,
      },
      defaultCorsPreflightOptions: {
        allowOrigins: corsConfig.allowedOrigins,
        allowMethods: corsConfig.allowedMethods || ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowHeaders: corsConfig.allowedHeaders || [
          'Content-Type',
          'Authorization', 
          'X-Amz-Date',
          'X-Api-Key',
          'X-Amz-Security-Token',
          'X-Amz-User-Agent',
          'X-Amz-Content-Sha256',
          'X-Amz-Target'
        ],
        allowCredentials: corsConfig.allowCredentials,
        maxAge: cdk.Duration.seconds(corsConfig.maxAge || 86400),
      },
    });

    // API Gateway resources and methods
    const apiResource = api.root.addResource('api');
    
    // Time records endpoints
    const timeRecordsResource = apiResource.addResource('time-records');
    timeRecordsResource.addMethod('GET', new apigateway.LambdaIntegration(timeRecordsHandler), {
      authorizationType: apigateway.AuthorizationType.IAM,
    });
    timeRecordsResource.addMethod('POST', new apigateway.LambdaIntegration(timeRecordsHandler), {
      authorizationType: apigateway.AuthorizationType.IAM,
    });
    
    // Timer-specific endpoints
    const startTimerResource = timeRecordsResource.addResource('start');
    startTimerResource.addMethod('POST', new apigateway.LambdaIntegration(timeRecordsHandler), {
      authorizationType: apigateway.AuthorizationType.IAM,
    });
    
    const activeTimerResource = timeRecordsResource.addResource('active');
    activeTimerResource.addMethod('GET', new apigateway.LambdaIntegration(timeRecordsHandler), {
      authorizationType: apigateway.AuthorizationType.IAM,
    });
    
    // Active timer update endpoint
    const activeTimerIdResource = activeTimerResource.addResource('{id}');
    activeTimerIdResource.addMethod('PUT', new apigateway.LambdaIntegration(timeRecordsHandler), {
      authorizationType: apigateway.AuthorizationType.IAM,
    });
    
    const stopTimerResource = timeRecordsResource.addResource('stop');
    const stopTimerIdResource = stopTimerResource.addResource('{id}');
    stopTimerIdResource.addMethod('PUT', new apigateway.LambdaIntegration(timeRecordsHandler), {
      authorizationType: apigateway.AuthorizationType.IAM,
    });
    
    // Regular time record CRUD endpoints
    const timeRecordResource = timeRecordsResource.addResource('{id}');
    timeRecordResource.addMethod('PUT', new apigateway.LambdaIntegration(timeRecordsHandler), {
      authorizationType: apigateway.AuthorizationType.IAM,
    });
    timeRecordResource.addMethod('DELETE', new apigateway.LambdaIntegration(timeRecordsHandler), {
      authorizationType: apigateway.AuthorizationType.IAM,
    });
    
    // Statistics endpoint
    const statsResource = apiResource.addResource('stats');
    statsResource.addMethod('GET', new apigateway.LambdaIntegration(timeRecordsHandler), {
      authorizationType: apigateway.AuthorizationType.IAM,
    });
    
    // Projects endpoints
    const projectsResource = apiResource.addResource('projects');
    projectsResource.addMethod('GET', new apigateway.LambdaIntegration(projectsHandler), {
      authorizationType: apigateway.AuthorizationType.IAM,
    });
    
    const projectSuggestionsResource = projectsResource.addResource('suggestions');
    projectSuggestionsResource.addMethod('GET', new apigateway.LambdaIntegration(projectsHandler), {
      authorizationType: apigateway.AuthorizationType.IAM,
    });

    // Profile management endpoints
    const profileResource = apiResource.addResource('profile');
    profileResource.addMethod('GET', new apigateway.LambdaIntegration(profileHandler), {
      authorizationType: apigateway.AuthorizationType.IAM,
    });
    profileResource.addMethod('PUT', new apigateway.LambdaIntegration(profileHandler), {
      authorizationType: apigateway.AuthorizationType.IAM,
    });
    profileResource.addMethod('DELETE', new apigateway.LambdaIntegration(profileHandler), {
      authorizationType: apigateway.AuthorizationType.IAM,
    });

    // Profile password management
    const profilePasswordResource = profileResource.addResource('password');
    profilePasswordResource.addMethod('PUT', new apigateway.LambdaIntegration(profileHandler), {
      authorizationType: apigateway.AuthorizationType.IAM,
    });

    // Profile password reset endpoints (no auth required for forgot password)
    const forgotPasswordResource = profileResource.addResource('forgot-password');
    forgotPasswordResource.addMethod('POST', new apigateway.LambdaIntegration(profileHandler), {
      authorizationType: apigateway.AuthorizationType.NONE, // No auth required for forgot password
    });

    const resetPasswordResource = profileResource.addResource('reset-password');
    resetPasswordResource.addMethod('POST', new apigateway.LambdaIntegration(profileHandler), {
      authorizationType: apigateway.AuthorizationType.NONE, // No auth required for reset password
    });

    // Update OAuth URLs to use CloudFront domain
    const cloudfrontUrl = `https://${distribution.distributionDomainName}`;
    
    // Update User Pool Client with CloudFront URL
    const cfnUserPoolClient = userPoolClient.node.defaultChild as cognito.CfnUserPoolClient;
    cfnUserPoolClient.callbackUrLs = [
      'http://localhost:3001/',
      cloudfrontUrl + '/'
    ];
    cfnUserPoolClient.logoutUrLs = [
      'http://localhost:3001/',
      cloudfrontUrl + '/'
    ];
    
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

    // Create IAM policy for API Gateway access
    const apiPolicy = new iam.Policy(this, 'ApiGatewayPolicy', {
      statements: [
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: ['execute-api:Invoke'],
          resources: [
            `${api.arnForExecuteApi('*', '/api/time-records', 'prod')}`,
            `${api.arnForExecuteApi('*', '/api/time-records/*', 'prod')}`,
            `${api.arnForExecuteApi('*', '/api/time-records/start', 'prod')}`,
            `${api.arnForExecuteApi('*', '/api/time-records/active', 'prod')}`,
            `${api.arnForExecuteApi('*', '/api/time-records/active/*', 'prod')}`,
            `${api.arnForExecuteApi('*', '/api/time-records/stop/*', 'prod')}`,
            `${api.arnForExecuteApi('*', '/api/projects', 'prod')}`,
            `${api.arnForExecuteApi('*', '/api/projects/*', 'prod')}`,
            `${api.arnForExecuteApi('*', '/api/stats', 'prod')}`,
            `${api.arnForExecuteApi('*', '/api/profile', 'prod')}`,
            `${api.arnForExecuteApi('*', '/api/profile/*', 'prod')}`,
          ],
        }),
      ],
    });

    // Attach API policy to authenticated role
    authenticatedRole.attachInlinePolicy(apiPolicy);

    // Attach the role to the identity pool
    new cognito.CfnIdentityPoolRoleAttachment(this, 'IdentityPoolRoleAttachment', {
      identityPoolId: identityPool.ref,
      roles: {
        authenticated: authenticatedRole.roleArn,
      },
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

    new cdk.CfnOutput(this, 'CloudFrontDistributionId', {
      value: distribution.distributionId,
      description: 'CloudFront Distribution ID for cache invalidation',
    });

    // Complete Amplify Gen 2 Outputs JSON
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
        },
        data: {
          aws_region: this.region,
          url: api.url,
          api_key: "",
          default_authorization_type: "AWS_IAM",
          authorization_types: ["AWS_IAM"]
        },
        custom: {
          API: {
            [api.restApiName]: {
              endpoint: api.url,
              region: this.region,
              apiName: api.restApiName,
            },
          },
        }
      }, null, 2),
      description: 'Complete amplify_outputs.json configuration for AWS Amplify Gen 2 - copy this to frontend/public/amplify_outputs.json',
    });
  }
}