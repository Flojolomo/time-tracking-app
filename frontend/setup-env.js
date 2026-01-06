#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const envExamplePath = path.join(__dirname, '.env.example');
const envPath = path.join(__dirname, '.env');

console.log('🚀 Setting up environment variables for Time Tracking App...\n');

// Check if .env already exists
if (fs.existsSync(envPath)) {
  console.log('✅ .env file already exists');
  console.log('📝 Please update it with your AWS Cognito configuration\n');
  process.exit(0);
}

// Check if .env.example exists
if (!fs.existsSync(envExamplePath)) {
  console.error('❌ .env.example file not found');
  process.exit(1);
}

// Copy .env.example to .env
try {
  const envExample = fs.readFileSync(envExamplePath, 'utf8');
  fs.writeFileSync(envPath, envExample);
  
  console.log('✅ Created .env file from .env.example');
  console.log('📝 Please update the following variables with your AWS values:\n');
  
  console.log('   VITE_COGNITO_USER_POOL_ID=your-user-pool-id');
  console.log('   VITE_COGNITO_USER_POOL_CLIENT_ID=your-user-pool-client-id');
  console.log('   VITE_COGNITO_DOMAIN=your-cognito-domain');
  console.log('   VITE_API_ENDPOINT=https://your-api-gateway-url\n');
  
  console.log('💡 You can get these values from:');
  console.log('   - AWS Console > Cognito > User Pools');
  console.log('   - Your infrastructure deployment output');
  console.log('   - Task 2.1 completion should provide these values\n');
  
  console.log('🔄 Remember to restart the development server after updating .env');
  
} catch (error) {
  console.error('❌ Error creating .env file:', error.message);
  process.exit(1);
}