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

# Step 2: Deploy CDK stack (this will generate amplify_outputs.json and deploy)
echo "☁️  Deploying AWS infrastructure..."
cd infrastructure
npm ci
npx cdk deploy --require-approval never

echo "✅ Deployment complete!"
echo ""
echo "📋 Next steps:"
echo "1. Check the CDK outputs for your website URL"
echo "2. The amplify_outputs.json has been automatically generated with your AWS resource values"
echo "3. Your frontend is deployed and configured!"