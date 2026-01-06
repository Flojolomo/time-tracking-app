// AWS Amplify configuration
// This configuration will be populated with actual values from the infrastructure deployment

export const awsConfig = {
  Auth: {
    region: process.env.VITE_AWS_REGION || 'us-east-1',
    userPoolId: process.env.VITE_COGNITO_USER_POOL_ID || '',
    userPoolWebClientId: process.env.VITE_COGNITO_USER_POOL_CLIENT_ID || '',
    mandatorySignIn: true,
    authenticationFlowType: 'USER_SRP_AUTH',
    oauth: {
      domain: process.env.VITE_COGNITO_DOMAIN || '',
      scope: ['email', 'profile', 'openid'],
      redirectSignIn: process.env.VITE_REDIRECT_SIGN_IN || 'http://localhost:5173/',
      redirectSignOut: process.env.VITE_REDIRECT_SIGN_OUT || 'http://localhost:5173/',
      responseType: 'code'
    }
  },
  API: {
    endpoints: [
      {
        name: 'timetracking',
        endpoint: process.env.VITE_API_ENDPOINT || 'http://localhost:3000',
        region: process.env.VITE_AWS_REGION || 'us-east-1'
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

  const missingVars = requiredVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    console.warn('Missing required AWS configuration:', missingVars);
    return false;
  }
  
  return true;
}