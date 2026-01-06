// AWS Amplify configuration
// This configuration will be populated with actual values from the infrastructure deployment

export const awsConfig = {
  Auth: {
    region: import.meta.env.VITE_AWS_REGION || 'us-east-1',
    userPoolId: import.meta.env.VITE_COGNITO_USER_POOL_ID || '',
    userPoolWebClientId: import.meta.env.VITE_COGNITO_USER_POOL_CLIENT_ID || '',
    mandatorySignIn: true,
    authenticationFlowType: 'USER_SRP_AUTH',
    oauth: {
      domain: import.meta.env.VITE_COGNITO_DOMAIN || '',
      scope: ['email', 'profile', 'openid'],
      redirectSignIn: import.meta.env.VITE_REDIRECT_SIGN_IN || 'http://localhost:3001/',
      redirectSignOut: import.meta.env.VITE_REDIRECT_SIGN_OUT || 'http://localhost:3001/',
      responseType: 'code'
    }
  },
  API: {
    endpoints: [
      {
        name: 'timetracking',
        endpoint: import.meta.env.VITE_API_ENDPOINT || 'http://localhost:3000',
        region: import.meta.env.VITE_AWS_REGION || 'us-east-1'
      }
    ]
  }
};

// Validation function to ensure required config is present
export function validateAwsConfig(): boolean {
  const requiredVars = [
    'VITE_COGNITO_USER_POOL_ID',
    'VITE_COGNITO_USER_POOL_CLIENT_ID'
  ];

  const missingVars = requiredVars.filter(varName => !import.meta.env[varName]);
  
  if (missingVars.length > 0) {
    console.warn('Missing required AWS configuration:', missingVars);
    console.warn('Please create a .env file based on .env.example with your AWS Cognito configuration');
    return false;
  }
  
  return true;
}

// Check if we're in development mode without proper AWS config
export function isDevelopmentMode(): boolean {
  return !import.meta.env.VITE_COGNITO_USER_POOL_ID || 
         !import.meta.env.VITE_COGNITO_USER_POOL_CLIENT_ID;
}