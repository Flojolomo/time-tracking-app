#!/bin/bash

# Script to extract amplify_outputs.json from CDK outputs and save it to the frontend

set -e

echo "🔧 Extracting Amplify configuration from CDK outputs..."

# Get the CDK output
cd infrastructure
AMPLIFY_CONFIG=$(npx cdk list --json 2>/dev/null | jq -r '.[0]' | xargs npx cdk output --stack-name 2>/dev/null | grep "AmplifyOutputsJson" | cut -d'=' -f2- | sed 's/^[[:space:]]*//')

if [ -z "$AMPLIFY_CONFIG" ]; then
    echo "❌ Could not find AmplifyOutputsJson output. Make sure the stack is deployed."
    exit 1
fi

# Save to frontend public directory
cd ../frontend/public
echo "$AMPLIFY_CONFIG" > amplify_outputs.json

echo "✅ Successfully updated frontend/public/amplify_outputs.json"
echo "📝 You can now run 'npm run dev' to test with the real AWS configuration"

# Pretty print the config for verification
echo ""
echo "📋 Configuration saved:"
echo "$AMPLIFY_CONFIG" | jq .