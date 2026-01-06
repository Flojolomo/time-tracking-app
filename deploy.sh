#!/bin/bash

# Time Tracking App Deployment Script
# This script builds the frontend and deploys the complete stack

set -e

echo "🚀 Starting Time Tracking App Deployment..."

# Step 1: Build the frontend
echo "📦 Building frontend..."
cd frontend
npm ci
npm run build
cd ..

# Step 2: Deploy CDK stack
echo "☁️  Deploying AWS infrastructure..."
cd infrastructure
npm ci
npx cdk deploy --require-approval never
cd ..

# Step 3: Extract and save the Amplify configuration
echo "🔧 Updating Amplify configuration..."
node update-amplify-config.js

echo "✅ Deployment complete!"
echo ""
echo "📋 Next steps:"
echo "1. Check the CDK outputs for your website URL"
echo "2. The amplify_outputs.json has been automatically updated in frontend/public/"
echo "3. Run 'cd frontend && npm run dev' to test locally with real AWS config"
echo "4. Your frontend is deployed and ready at the CloudFront URL!"