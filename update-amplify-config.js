#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔧 Extracting Amplify configuration from CDK outputs...');

try {
  // Get CDK outputs
  const outputs = execSync('cd infrastructure && npx cdk output --json', { encoding: 'utf8' });
  const outputsJson = JSON.parse(outputs);
  
  // Find the AmplifyOutputsJson output
  const amplifyConfigString = outputsJson.AmplifyOutputsJson;
  
  if (!amplifyConfigString) {
    console.error('❌ Could not find AmplifyOutputsJson output. Make sure the stack is deployed.');
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
  console.error('Make sure you have deployed the CDK stack first with: cd infrastructure && npx cdk deploy');
  process.exit(1);
}