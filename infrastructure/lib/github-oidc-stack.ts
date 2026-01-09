import * as cdk from 'aws-cdk-lib';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';

export interface GitHubOidcStackProps extends cdk.StackProps {
  /**
   * GitHub repository in the format "owner/repo"
   * Example: "myorg/time-tracking-app"
   */
  readonly githubRepository: string;
  
  /**
   * GitHub organization or username
   */
  readonly githubOrg: string;
  
  /**
   * Main application stack name for cross-stack references
   */
  readonly mainStackName: string;
}

export class GitHubOidcStack extends cdk.Stack {
  public readonly deploymentRole: iam.Role;
  public readonly oidcProvider: iam.OpenIdConnectProvider;

  constructor(scope: Construct, id: string, props: GitHubOidcStackProps) {
    super(scope, id, props);

    // Create GitHub OIDC Identity Provider
    this.oidcProvider = new iam.OpenIdConnectProvider(this, 'GitHubOidcProvider', {
      url: 'https://token.actions.githubusercontent.com',
      clientIds: ['sts.amazonaws.com'],
      thumbprints: [
        // GitHub Actions OIDC thumbprint (as of 2024)
        '6938fd4d98bab03faadb97b34396831e3780aea1',
        // Backup thumbprint in case GitHub rotates certificates
        '1c58a3a8518e8759bf075b76b750d4f2df264fcd'
      ],
    });

    // Create IAM role for GitHub Actions deployment
    this.deploymentRole = new iam.Role(this, 'GitHubActionsDeploymentRole', {
      roleName: `GitHubActions-${props.githubOrg}-${props.mainStackName}-DeploymentRole`,
      assumedBy: new iam.WebIdentityPrincipal(
        this.oidcProvider.openIdConnectProviderArn,
        {
          StringEquals: {
            'token.actions.githubusercontent.com:aud': 'sts.amazonaws.com',
          },
          StringLike: {
            'token.actions.githubusercontent.com:sub': [
              `repo:${props.githubRepository}:ref:refs/heads/main`,
              `repo:${props.githubRepository}:pull_request`,
              `repo:${props.githubRepository}:environment:production`,
              `repo:${props.githubRepository}:environment:development`,
            ],
          },
        }
      ),
      description: 'Role for GitHub Actions to deploy Time Tracking application',
      maxSessionDuration: cdk.Duration.hours(1),
    });

    // Add comprehensive deployment permissions
    this.deploymentRole.addManagedPolicy(
      iam.ManagedPolicy.fromAwsManagedPolicyName('PowerUserAccess')
    );

    // Add specific IAM permissions needed for CDK deployments
    this.deploymentRole.addToPolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        // IAM permissions for CDK role management
        'iam:CreateRole',
        'iam:DeleteRole',
        'iam:UpdateRole',
        'iam:GetRole',
        'iam:ListRoles',
        'iam:PassRole',
        'iam:AttachRolePolicy',
        'iam:DetachRolePolicy',
        'iam:PutRolePolicy',
        'iam:DeleteRolePolicy',
        'iam:GetRolePolicy',
        'iam:ListRolePolicies',
        'iam:ListAttachedRolePolicies',
        'iam:CreatePolicy',
        'iam:DeletePolicy',
        'iam:GetPolicy',
        'iam:GetPolicyVersion',
        'iam:ListPolicyVersions',
        'iam:CreatePolicyVersion',
        'iam:DeletePolicyVersion',
        'iam:SetDefaultPolicyVersion',
        // Service-linked role permissions
        'iam:CreateServiceLinkedRole',
        'iam:DeleteServiceLinkedRole',
        'iam:GetServiceLinkedRoleDeletionStatus',
        // Instance profile permissions for Lambda
        'iam:CreateInstanceProfile',
        'iam:DeleteInstanceProfile',
        'iam:AddRoleToInstanceProfile',
        'iam:RemoveRoleFromInstanceProfile',
        'iam:GetInstanceProfile',
        'iam:ListInstanceProfiles',
        'iam:ListInstanceProfilesForRole',
      ],
      resources: ['*'],
    }));

    // Add CloudFormation permissions for CDK stack management
    this.deploymentRole.addToPolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'cloudformation:CreateStack',
        'cloudformation:UpdateStack',
        'cloudformation:DeleteStack',
        'cloudformation:DescribeStacks',
        'cloudformation:DescribeStackEvents',
        'cloudformation:DescribeStackResources',
        'cloudformation:GetTemplate',
        'cloudformation:ListStacks',
        'cloudformation:ListStackResources',
        'cloudformation:CreateChangeSet',
        'cloudformation:DescribeChangeSet',
        'cloudformation:ExecuteChangeSet',
        'cloudformation:DeleteChangeSet',
        'cloudformation:ListChangeSets',
        'cloudformation:GetStackPolicy',
        'cloudformation:SetStackPolicy',
        'cloudformation:ValidateTemplate',
      ],
      resources: [
        `arn:aws:cloudformation:${this.region}:${this.account}:stack/${props.mainStackName}/*`,
        `arn:aws:cloudformation:${this.region}:${this.account}:stack/CDKToolkit/*`,
      ],
    }));

    // Add S3 permissions for CDK bootstrap bucket and website deployment
    this.deploymentRole.addToPolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        's3:GetObject',
        's3:PutObject',
        's3:DeleteObject',
        's3:ListBucket',
        's3:GetBucketLocation',
        's3:GetBucketPolicy',
        's3:PutBucketPolicy',
        's3:DeleteBucketPolicy',
        's3:GetBucketVersioning',
        's3:PutBucketVersioning',
        's3:GetBucketNotification',
        's3:PutBucketNotification',
        's3:GetBucketWebsite',
        's3:PutBucketWebsite',
        's3:DeleteBucketWebsite',
        's3:GetBucketCors',
        's3:PutBucketCors',
        's3:DeleteBucketCors',
        's3:GetBucketPublicAccessBlock',
        's3:PutBucketPublicAccessBlock',
        's3:DeleteBucketPublicAccessBlock',
      ],
      resources: [
        `arn:aws:s3:::cdk-*-assets-${this.account}-${this.region}`,
        `arn:aws:s3:::cdk-*-assets-${this.account}-${this.region}/*`,
        `arn:aws:s3:::time-tracking-website-${this.account}-${this.region}`,
        `arn:aws:s3:::time-tracking-website-${this.account}-${this.region}/*`,
      ],
    }));

    // Add CloudFront permissions for cache invalidation
    this.deploymentRole.addToPolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'cloudfront:CreateInvalidation',
        'cloudfront:GetInvalidation',
        'cloudfront:ListInvalidations',
        'cloudfront:GetDistribution',
        'cloudfront:GetDistributionConfig',
        'cloudfront:ListDistributions',
      ],
      resources: ['*'], // CloudFront doesn't support resource-level permissions for these actions
    }));

    // Add SSM Parameter Store permissions for configuration
    this.deploymentRole.addToPolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'ssm:GetParameter',
        'ssm:GetParameters',
        'ssm:PutParameter',
        'ssm:DeleteParameter',
        'ssm:GetParametersByPath',
      ],
      resources: [
        `arn:aws:ssm:${this.region}:${this.account}:parameter/cdk-bootstrap/*`,
        `arn:aws:ssm:${this.region}:${this.account}:parameter/${props.mainStackName}/*`,
      ],
    }));

    // Create a separate role for development environment deployments
    const developmentRole = new iam.Role(this, 'GitHubActionsDevelopmentRole', {
      roleName: `GitHubActions-${props.githubOrg}-${props.mainStackName}-DevelopmentRole`,
      assumedBy: new iam.WebIdentityPrincipal(
        this.oidcProvider.openIdConnectProviderArn,
        {
          StringEquals: {
            'token.actions.githubusercontent.com:aud': 'sts.amazonaws.com',
          },
          StringLike: {
            'token.actions.githubusercontent.com:sub': [
              `repo:${props.githubRepository}:pull_request`,
              `repo:${props.githubRepository}:environment:development`,
            ],
          },
        }
      ),
      description: 'Role for GitHub Actions to deploy to development environment',
      maxSessionDuration: cdk.Duration.hours(1),
    });

    // Development role gets the same permissions as production for now
    // In a real scenario, you might want to restrict this further
    developmentRole.addManagedPolicy(
      iam.ManagedPolicy.fromAwsManagedPolicyName('PowerUserAccess')
    );

    // Copy the same policies to development role
    this.deploymentRole.node.children
      .filter(child => child instanceof iam.Policy)
      .forEach(policy => {
        developmentRole.attachInlinePolicy(policy as iam.Policy);
      });

    // Outputs for GitHub Actions workflow configuration
    new cdk.CfnOutput(this, 'GitHubOidcProviderArn', {
      value: this.oidcProvider.openIdConnectProviderArn,
      description: 'ARN of the GitHub OIDC Identity Provider',
      exportName: `${this.stackName}-GitHubOidcProviderArn`,
    });

    new cdk.CfnOutput(this, 'DeploymentRoleArn', {
      value: this.deploymentRole.roleArn,
      description: 'ARN of the GitHub Actions deployment role for production',
      exportName: `${this.stackName}-DeploymentRoleArn`,
    });

    new cdk.CfnOutput(this, 'DevelopmentRoleArn', {
      value: developmentRole.roleArn,
      description: 'ARN of the GitHub Actions deployment role for development',
      exportName: `${this.stackName}-DevelopmentRoleArn`,
    });

    new cdk.CfnOutput(this, 'AwsRegion', {
      value: this.region,
      description: 'AWS Region for deployments',
      exportName: `${this.stackName}-AwsRegion`,
    });

    new cdk.CfnOutput(this, 'GitHubActionsConfiguration', {
      value: JSON.stringify({
        aws_region: this.region,
        production_role_arn: this.deploymentRole.roleArn,
        development_role_arn: developmentRole.roleArn,
        main_stack_name: props.mainStackName,
        github_repository: props.githubRepository,
        s3_bucket_name: `time-tracking-website-${this.account}-${this.region}`,
      }, null, 2),
      description: 'Configuration values for GitHub Actions workflows - copy these to your repository secrets/variables',
    });
  }
}