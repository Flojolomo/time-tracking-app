// Runtime configuration for Time Tracking App
// This file is loaded dynamically at runtime and can be updated without rebuilding the app

window.APP_CONFIG = {
  aws: {
    region: 'us-east-1',
    cognito: {
      userPoolId: '', // Set this to your Cognito User Pool ID
      userPoolWebClientId: '', // Set this to your Cognito User Pool Client ID
      domain: '', // Set this to your Cognito domain (optional)
    },
    api: {
      endpoint: '', // Set this to your API Gateway endpoint
    }
  },
  app: {
    name: 'Time Tracking App',
    version: '1.0.0',
    environment: 'development' // development, staging, production
  },
  features: {
    enableOAuth: false, // Set to true if using OAuth
    enableMFA: false, // Set to true if using MFA
    enableAnalytics: false // Set to true if using analytics
  }
};

// Development mode detection
window.APP_CONFIG.isDevelopmentMode = function() {
  return !this.aws.cognito.userPoolId || !this.aws.cognito.userPoolWebClientId;
};

// Validation function
window.APP_CONFIG.validate = function() {
  const required = [
    'aws.cognito.userPoolId',
    'aws.cognito.userPoolWebClientId'
  ];
  
  const missing = required.filter(path => {
    const value = path.split('.').reduce((obj, key) => obj?.[key], this);
    return !value;
  });
  
  return {
    isValid: missing.length === 0,
    missing: missing
  };
};