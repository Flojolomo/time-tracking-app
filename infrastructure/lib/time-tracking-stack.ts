import * as cdk from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment';
import { Construct } from 'constructs';

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
      passwordPolicy: {
        minLength: 8,
        requireLowercase: true,
        requireUppercase: true,
        requireDigits: true,
        requireSymbols: false,
      },
      accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // Cognito User Pool Client
    const userPoolClient = new cognito.UserPoolClient(this, 'TimeTrackingUserPoolClient', {
      userPool,
      authFlows: {
        adminUserPassword: true,
        userPassword: true,
        userSrp: true,
      },
      generateSecret: false,
      refreshTokenValidity: cdk.Duration.days(30),
      accessTokenValidity: cdk.Duration.hours(1),
      idTokenValidity: cdk.Duration.hours(1),
    });

    // Lambda function for API handlers
    const apiHandler = new lambda.Function(this, 'TimeTrackingApiHandler', {
      runtime: lambda.Runtime.NODEJS_18_X,
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
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ACLS,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    // CloudFront Distribution
    const distribution = new cloudfront.Distribution(this, 'TimeTrackingDistribution', {
      defaultBehavior: {
        origin: new origins.S3Origin(websiteBucket),
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

    new cdk.CfnOutput(this, 'WebsiteUrl', {
      value: distribution.distributionDomainName,
      description: 'CloudFront Distribution URL',
    });

    new cdk.CfnOutput(this, 'S3BucketName', {
      value: websiteBucket.bucketName,
      description: 'S3 Bucket Name for website hosting',
    });
  }
}