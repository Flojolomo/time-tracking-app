#!/bin/bash

# Deploy GitHub OIDC authentication infrastructure
# Usage: ./deploy-oidc.sh [github-org] [github-repo] [main-stack-name]

set -e

# Default values
DEFAULT_GITHUB_ORG="your-github-org"
DEFAULT_GITHUB_REPO="time-tracking-app"
DEFAULT_MAIN_STACK_NAME="TimeTrackingStack"

# Get parameters from command line or use defaults
GITHUB_ORG="${1:-$DEFAULT_GITHUB_ORG}"
GITHUB_REPO="${2:-$DEFAULT_GITHUB_REPO}"
MAIN_STACK_NAME="${3:-$DEFAULT_MAIN_STACK_NAME}"

echo "🚀 Deploying GitHub OIDC authentication infrastructure..."
echo "   GitHub Organization: $GITHUB_ORG"
echo "   GitHub Repository: $GITHUB_REPO"
echo "   Main Stack Name: $MAIN_STACK_NAME"
echo ""

# Check if AWS CLI is configured
if ! aws sts get-caller-identity > /dev/null 2>&1; then
    echo "❌ AWS CLI is not configured or credentials are invalid"
    echo "   Please run 'aws configure' or set up your AWS credentials"
    exit 1
fi

# Check if CDK is bootstrapped
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
REGION=$(aws configure get region || echo "us-east-1")

echo "📋 Checking CDK bootstrap status..."
if ! aws cloudformation describe-stacks --stack-name CDKToolkit --region $REGION > /dev/null 2>&1; then
    echo "❌ CDK is not bootstrapped in account $ACCOUNT_ID, region $REGION"
    echo "   Please run: cdk bootstrap aws://$ACCOUNT_ID/$REGION"
    exit 1
fi

echo "✅ CDK is bootstrapped"

# Build the project
echo "🔨 Building CDK project..."
npm run build

# Deploy the OIDC stack
echo "🚀 Deploying OIDC stack..."
npm run deploy:oidc -- \
    -c github-org="$GITHUB_ORG" \
    -c github-repo="$GITHUB_REPO" \
    -c main-stack-name="$MAIN_STACK_NAME" \
    --require-approval never

echo ""
echo "✅ GitHub OIDC authentication infrastructure deployed successfully!"
echo ""
echo "📝 Next steps:"
echo "1. Copy the GitHubActionsConfiguration output values to your GitHub repository"
echo "2. Set up the following repository secrets and variables:"
echo "   Variables:"
echo "   - AWS_REGION"
echo "   - MAIN_STACK_NAME"
echo "   - S3_BUCKET_NAME"
echo "   Secrets:"
echo "   - AWS_PRODUCTION_ROLE_ARN"
echo "   - AWS_DEVELOPMENT_ROLE_ARN"
echo "3. Copy .github-workflows-example/deploy.yml to .github/workflows/deploy.yml in your repository"
echo ""
echo "📖 For detailed setup instructions, see GITHUB_OIDC_SETUP.md"