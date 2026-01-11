#!/bin/bash

# Time Tracking App Deployment Script
# This script builds the frontend and deploys the complete stack

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}$1${NC}"
}

print_success() {
    echo -e "${GREEN}$1${NC}"
}

print_warning() {
    echo -e "${YELLOW}$1${NC}"
}

print_error() {
    echo -e "${RED}$1${NC}"
}

# Check if AWS CLI is configured
check_aws_config() {
    if ! aws sts get-caller-identity &> /dev/null; then
        print_error "❌ AWS CLI is not configured or credentials are invalid"
        print_warning "Please run 'aws configure' or set up your AWS credentials"
        exit 1
    fi
    
    local account_id=$(aws sts get-caller-identity --query Account --output text)
    local region=$(aws configure get region)
    print_status "📋 Deploying to AWS Account: $account_id in region: $region"
}

# Function to deploy infrastructure
deploy_infrastructure() {
    print_status "☁️  Deploying AWS infrastructure..."
    cd infrastructure
    
    # Install dependencies if needed
    if [ ! -d "node_modules" ]; then
        print_status "📦 Installing infrastructure dependencies..."
        npm ci
    fi
    
    # Build Lambda functions
    print_status "🔨 Building Lambda functions..."
    npm run build:lambdas
    
    # Deploy CDK stack
    print_status "🚀 Deploying CDK stack..."
    npx cdk deploy --require-approval never
    
    cd ..
}

# Function to deploy frontend
deploy_frontend() {
    print_status "📦 Building and deploying frontend..."
    
    # # Update Amplify configuration first
    # print_status "🔧 Updating Amplify configuration..."
    # node update-amplify-config.js
    
    cd frontend
    
    # Install dependencies if needed
    if [ ! -d "node_modules" ]; then
        print_status "📦 Installing frontend dependencies..."
        npm ci
    fi
    
    # Build frontend
    print_status "🔨 Building frontend..."
    npm run build:prod
    
    # Get S3 bucket name from CloudFormation outputs
    print_status "📤 Uploading to S3..."
    local bucket_name=$(aws cloudformation describe-stacks \
        --stack-name TimeTrackingStack \
        --query "Stacks[0].Outputs[?OutputKey=='S3BucketName'].OutputValue" \
        --output text 2>/dev/null)
    
    if [ -z "$bucket_name" ]; then
        print_error "❌ Could not find S3 bucket name in CloudFormation outputs"
        exit 1
    fi
    
    # Sync to S3
    aws s3 sync dist/ s3://$bucket_name/ --delete
    
    # Invalidate CloudFront cache
    print_status "🔄 Invalidating CloudFront cache..."
    local distribution_id=$(aws cloudformation describe-stacks \
        --stack-name TimeTrackingStack \
        --query "Stacks[0].Outputs[?contains(OutputKey, 'Distribution')].OutputValue" \
        --output text 2>/dev/null)
    
    if [ ! -z "$distribution_id" ]; then
        aws cloudfront create-invalidation \
            --distribution-id $distribution_id \
            --paths "/*" > /dev/null
        print_success "✅ CloudFront cache invalidated"
    fi
    
    cd ..
}

# Function to show deployment results
show_results() {
    print_success "🎉 Deployment complete!"
    echo ""
    print_status "📋 Deployment Information:"
    
    # Get all relevant outputs
    local website_url=$(aws cloudformation describe-stacks \
        --stack-name TimeTrackingStack \
        --query "Stacks[0].Outputs[?OutputKey=='WebsiteUrl'].OutputValue" \
        --output text 2>/dev/null)
    
    local api_url=$(aws cloudformation describe-stacks \
        --stack-name TimeTrackingStack \
        --query "Stacks[0].Outputs[?OutputKey=='ApiUrl'].OutputValue" \
        --output text 2>/dev/null)
    
    echo "🌐 Website URL: $website_url"
    echo "🔗 API URL: $api_url"
    echo ""
    print_status "📝 Next steps:"
    echo "1. Visit your website at: $website_url"
    echo "2. The amplify_outputs.json has been updated in frontend/public/"
    echo "3. Run 'cd frontend && npm run dev' to test locally with real AWS config"
    echo "4. Check CloudWatch logs for any Lambda function issues"
}

# Main deployment flow
main() {
    print_status "🚀 Starting Time Tracking App Deployment..."
    echo ""
    
    # Check prerequisites
    check_aws_config
    
    # Deploy infrastructure first
    deploy_infrastructure
    
    # Deploy frontend
    deploy_frontend
    
    # Show results
    show_results
}

# Handle script arguments
case "${1:-}" in
    "infrastructure"|"infra")
        print_status "🚀 Deploying infrastructure only..."
        check_aws_config
        deploy_infrastructure
        print_success "✅ Infrastructure deployment complete!"
        ;;
    "frontend"|"fe")
        print_status "🚀 Deploying frontend only..."
        check_aws_config
        deploy_frontend
        print_success "✅ Frontend deployment complete!"
        ;;
    "help"|"-h"|"--help")
        echo "Time Tracking App Deployment Script"
        echo ""
        echo "Usage: $0 [command]"
        echo ""
        echo "Commands:"
        echo "  (no args)     Deploy both infrastructure and frontend"
        echo "  infrastructure Deploy only AWS infrastructure (CDK)"
        echo "  frontend      Deploy only frontend to S3/CloudFront"
        echo "  help          Show this help message"
        echo ""
        echo "Prerequisites:"
        echo "  - AWS CLI configured with appropriate credentials"
        echo "  - Node.js and npm installed"
        echo "  - CDK CLI installed (npm install -g aws-cdk)"
        ;;
    *)
        main
        ;;
esac