#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔧 Extracting Amplify configuration from CloudFormation outputs...');

try {
  // Get CloudFormation stack outputs directly
  const outputs = execSync('aws cloudformation describe-stacks --stack-name TimeTrackingStack --query "Stacks[0].Outputs" --output json', { encoding: 'utf8' });
  const outputsArray = JSON.parse(outputs);
  
  // Convert array to object
  const outputsObj = {};
  outputsArray.forEach(output => {
    outputsObj[output.OutputKey] = output.OutputValue;
  });
  
  // Find the AmplifyOutputsJson output
  const amplifyConfigString = outputsObj.AmplifyOutputsJson;
  
  if (!amplifyConfigString) {
    console.error('❌ Could not find AmplifyOutputsJson output. Make sure the stack is deployed.');
    console.error('Available outputs:', Object.keys(outputsObj));
    process.exit(1);
  }
  
  // Parse the JSON string
  const amplifyConfig = JSON.parse(amplifyConfigString);
  
  // Save to frontend public directory
  const configPath = path.join(__dirname, 'frontend', 'public', 'amplify_outputs.json');
  fs.writeFileSync(configPath, JSON.stringify(amplifyConfig, null, 2));
  
  console.log('✅ Successfully updated frontend/public/amplify_outputs.json');
  console.log('📝 You can now run "npm run dev" to test with the real AWS configuration');
  console.log('');
  console.log('📋 Configuration saved:');
  console.log(JSON.stringify(amplifyConfig, null, 2));
  
} catch (error) {
  console.error('❌ Error:', error.message);
  console.error('Make sure you have:');
  console.error('1. Deployed the CDK stack: cd infrastructure && npx cdk deploy');
  console.error('2. AWS CLI configured with proper credentials');
  process.exit(1);
}