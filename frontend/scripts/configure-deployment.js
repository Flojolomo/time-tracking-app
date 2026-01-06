#!/usr/bin/env node

/**
 * Deployment Configuration Script
 * 
 * This script is called by the CDK deployment process to inject
 * AWS configuration values into the static build.
 * 
 * Usage: node configure-deployment.js <config-json>
 */

const fs = require('fs');
const path = require('path');

function configureDeployment(config) {
  const configPath = path.join(__dirname, '../dist/config.js');
  
  // Read the template
  let configContent = fs.readFileSync(configPath, 'utf8');
  
  // Replace placeholders with actual values
  configContent = configContent
    .replace('${AWS_REGION}', config.region || 'us-east-1')
    .replace('${COGNITO_USER_POOL_ID}', config.userPoolId || '')
    .replace('${COGNITO_USER_POOL_CLIENT_ID}', config.userPoolWebClientId || '')
    .replace('${COGNITO_DOMAIN}', config.cognitoDomain || '')
    .replace('${API_ENDPOINT}', config.apiEndpoint || '')
    .replace('${REDIRECT_SIGN_IN}', config.redirectSignIn || '')
    .replace('${REDIRECT_SIGN_OUT}', config.redirectSignOut || '');
  
  // Write the configured file
  fs.writeFileSync(configPath, configContent);
  
  console.log('✅ AWS configuration injected into static build');
  console.log('📍 Configuration file:', configPath);
}

// Main execution
if (require.main === module) {
  const configArg = process.argv[2];
  
  if (!configArg) {
    console.error('❌ Usage: node configure-deployment.js <config-json>');
    console.error('   Example: node configure-deployment.js \'{"userPoolId":"us-east-1_abc123"}\'');
    process.exit(1);
  }
  
  try {
    const config = JSON.parse(configArg);
    configureDeployment(config);
  } catch (error) {
    console.error('❌ Error parsing configuration:', error.message);
    process.exit(1);
  }
}

module.exports = { configureDeployment };