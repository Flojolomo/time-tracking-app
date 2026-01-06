#!/bin/bash

# Development Setup Script for Time Tracking App
# This script sets up the development environment

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

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

# Check Node.js version
check_node_version() {
    if ! command -v node &> /dev/null; then
        print_error "❌ Node.js is not installed"
        print_warning "Please install Node.js 18+ from https://nodejs.org/"
        exit 1
    fi
    
    local node_version=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$node_version" -lt 18 ]; then
        print_error "❌ Node.js version $node_version is too old"
        print_warning "Please upgrade to Node.js 18+ for compatibility"
        exit 1
    fi
    
    print_success "✅ Node.js $(node --version) detected"
}

# Check npm version
check_npm_version() {
    local npm_version=$(npm --version)
    print_status "📦 npm version: $npm_version"
    
    # Check if compatible with npm 10.2.4 requirement
    local major_version=$(echo $npm_version | cut -d'.' -f1)
    if [ "$major_version" -lt 8 ]; then
        print_warning "⚠️  npm version might be too old. Consider upgrading to npm 10+"
    fi
}

# Install dependencies
install_dependencies() {
    print_status "📦 Installing dependencies..."
    
    # Install root dependencies
    print_status "Installing root dependencies..."
    npm install
    
    # Install frontend dependencies
    print_status "Installing frontend dependencies..."
    cd frontend
    npm ci
    cd ..
    
    # Install infrastructure dependencies
    print_status "Installing infrastructure dependencies..."
    cd infrastructure
    npm ci
    cd ..
    
    # Install Lambda dependencies
    print_status "Installing Lambda dependencies..."
    cd infrastructure/lambda/timeRecords
    npm ci
    cd ../../..
    
    cd infrastructure/lambda/projects
    npm ci
    cd ../../..
    
    print_success "✅ All dependencies installed"
}

# Check AWS CLI
check_aws_cli() {
    if ! command -v aws &> /dev/null; then
        print_warning "⚠️  AWS CLI is not installed"
        print_status "AWS CLI is needed for deployment but not for local development"
        print_status "Install from: https://aws.amazon.com/cli/"
        return
    fi
    
    print_success "✅ AWS CLI detected"
    
    if aws sts get-caller-identity &> /dev/null; then
        local account_id=$(aws sts get-caller-identity --query Account --output text)
        local region=$(aws configure get region)
        print_success "✅ AWS credentials configured (Account: $account_id, Region: $region)"
    else
        print_warning "⚠️  AWS credentials not configured"
        print_status "Run 'aws configure' to set up credentials for deployment"
    fi
}

# Check CDK CLI
check_cdk_cli() {
    if ! command -v cdk &> /dev/null; then
        print_warning "⚠️  AWS CDK CLI is not installed"
        print_status "Install with: npm install -g aws-cdk"
        print_status "CDK is needed for infrastructure deployment"
        return
    fi
    
    print_success "✅ AWS CDK CLI detected ($(cdk --version))"
}

# Create development configuration
setup_dev_config() {
    print_status "🔧 Setting up development configuration..."
    
    # Check if amplify_outputs.json exists
    if [ ! -f "frontend/public/amplify_outputs.json" ]; then
        print_status "Creating default amplify_outputs.json for local development..."
        cat > frontend/public/amplify_outputs.json << 'EOF'
{
  "version": "1",
  "auth": {
    "aws_region": "us-east-1",
    "user_pool_id": "DEVELOPMENT_MODE",
    "user_pool_client_id": "DEVELOPMENT_MODE",
    "identity_pool_id": "DEVELOPMENT_MODE",
    "password_policy": {
      "min_length": 8,
      "require_lowercase": true,
      "require_uppercase": true,
      "require_numbers": true,
      "require_symbols": false
    },
    "oauth": {
      "identity_providers": ["COGNITO"],
      "domain": "DEVELOPMENT_MODE",
      "scopes": ["email", "openid", "profile"],
      "redirect_sign_in_uri": ["http://localhost:3001/"],
      "redirect_sign_out_uri": ["http://localhost:3001/"],
      "response_type": "code"
    },
    "username_attributes": ["email"],
    "user_verification_types": ["email"]
  },
  "data": {
    "aws_region": "us-east-1",
    "url": "http://localhost:3001/api",
    "api_key": "",
    "default_authorization_type": "AMAZON_COGNITO_USER_POOLS",
    "authorization_types": ["AMAZON_COGNITO_USER_POOLS"]
  }
}
EOF
        print_success "✅ Created default amplify_outputs.json"
        print_warning "⚠️  This is a development configuration. Deploy infrastructure to get real AWS config."
    else
        print_success "✅ amplify_outputs.json already exists"
    fi
}

# Build everything
build_all() {
    print_status "🔨 Building all components..."
    
    # Build frontend
    print_status "Building frontend..."
    cd frontend
    npm run build
    cd ..
    
    # Build infrastructure
    print_status "Building infrastructure..."
    cd infrastructure
    npm run build:all
    cd ..
    
    print_success "✅ All components built successfully"
}

# Show next steps
show_next_steps() {
    print_success "🎉 Development environment setup complete!"
    echo ""
    print_status "📋 Next steps:"
    echo ""
    echo "🚀 Start development:"
    echo "   npm run dev                    # Start frontend development server"
    echo "   cd frontend && npm run dev     # Alternative way to start frontend"
    echo ""
    echo "🏗️  Deploy to AWS:"
    echo "   ./deploy.sh                    # Deploy everything to AWS"
    echo "   ./deploy.sh infrastructure     # Deploy only infrastructure"
    echo "   ./deploy.sh frontend          # Deploy only frontend"
    echo ""
    echo "🧪 Run tests:"
    echo "   cd frontend && npm test        # Run frontend tests"
    echo ""
    echo "📁 Project structure:"
    echo "   frontend/                      # React frontend application"
    echo "   infrastructure/                # AWS CDK infrastructure code"
    echo "   infrastructure/lambda/         # Lambda function source code"
    echo ""
    print_status "🌐 Local development will run at: http://localhost:5173"
    print_warning "⚠️  For full functionality, deploy infrastructure and update amplify_outputs.json"
}

# Main setup flow
main() {
    print_status "🚀 Setting up Time Tracking App development environment..."
    echo ""
    
    check_node_version
    check_npm_version
    install_dependencies
    check_aws_cli
    check_cdk_cli
    setup_dev_config
    build_all
    show_next_steps
}

# Handle script arguments
case "${1:-}" in
    "deps"|"dependencies")
        print_status "🚀 Installing dependencies only..."
        install_dependencies
        ;;
    "config")
        print_status "🚀 Setting up configuration only..."
        setup_dev_config
        ;;
    "build")
        print_status "🚀 Building all components..."
        build_all
        ;;
    "help"|"-h"|"--help")
        echo "Time Tracking App Development Setup Script"
        echo ""
        echo "Usage: $0 [command]"
        echo ""
        echo "Commands:"
        echo "  (no args)     Complete development environment setup"
        echo "  deps          Install dependencies only"
        echo "  config        Setup configuration files only"
        echo "  build         Build all components only"
        echo "  help          Show this help message"
        echo ""
        echo "Prerequisites:"
        echo "  - Node.js 18+ installed"
        echo "  - npm installed"
        echo "  - (Optional) AWS CLI for deployment"
        echo "  - (Optional) CDK CLI for infrastructure deployment"
        ;;
    *)
        main
        ;;
esac