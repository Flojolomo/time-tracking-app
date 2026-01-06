// AWS Amplify configuration
// This configuration supports both development (env vars) and production (config file)

// Default configuration that can be overridden
let runtimeConfig: any = null;

// Try to load runtime configuration (for production)
try {
  // This will be populated by the deployment process
  if (typeof window !== 'undefined' && (window as any).__AWS_CONFIG__) {
    runtimeConfig = (window as any).__AWS_CONFIG__;
  }
} catch (error) {
  // Runtime config not available, will fall back to build-time config
}

export const awsConfig = {
  Auth: {
    region: runtimeConfig?.region || import.meta.env.VITE_AWS_REGION || 'us-east-1',
    userPoolId: runtimeConfig?.userPoolId || import.meta.env.VITE_COGNITO_USER_POOL_ID || '',
    userPoolWebClientId: runtimeConfig?.userPoolWebClientId || import.meta.env.VITE_COGNITO_USER_POOL_CLIENT_ID || '',
    mandatorySignIn: true,
    authenticationFlowType: 'USER_SRP_AUTH',
    oauth: {
      domain: runtimeConfig?.cognitoDomain || import.meta.env.VITE_COGNITO_DOMAIN || '',
      scope: ['email', 'profile', 'openid'],
      redirectSignIn: runtimeConfig?.redirectSignIn || import.meta.env.VITE_REDIRECT_SIGN_IN || window?.location?.origin || 'http://localhost:3001/',
      redirectSignOut: runtimeConfig?.redirectSignOut || import.meta.env.VITE_REDIRECT_SIGN_OUT || window?.location?.origin || 'http://localhost:3001/',
      responseType: 'code'
    }
  },
  API: {
    endpoints: [
      {
        name: 'timetracking',
        endpoint: runtimeConfig?.apiEndpoint || import.meta.env.VITE_API_ENDPOINT || 'http://localhost:3000',
        region: runtimeConfig?.region || import.meta.env.VITE_AWS_REGION || 'us-east-1'
      }
    ]
  }
};

// Validation function to ensure required config is present
export function validateAwsConfig(): boolean {
  const config = awsConfig.Auth;
  
  if (!config.userPoolId || !config.userPoolWebClientId) {
    console.warn('Missing required AWS configuration: userPoolId or userPoolWebClientId');
    console.warn('For development: Create a .env file with VITE_COGNITO_* variables');
    console.warn('For production: Ensure __AWS_CONFIG__ is set by deployment process');
    return false;
  }
  
  return true;
}

// Check if we're in development mode without proper AWS config
export function isDevelopmentMode(): boolean {
  return !awsConfig.Auth.userPoolId || !awsConfig.Auth.userPoolWebClientId;
}

// Function to set runtime configuration (called by deployment process)
export function setRuntimeConfig(config: {
  region: string;
  userPoolId: string;
  userPoolWebClientId: string;
  cognitoDomain?: string;
  apiEndpoint?: string;
  redirectSignIn?: string;
  redirectSignOut?: string;
}) {
  if (typeof window !== 'undefined') {
    (window as any).__AWS_CONFIG__ = config;
  }
  
  // Update the awsConfig object
  Object.assign(awsConfig.Auth, {
    region: config.region,
    userPoolId: config.userPoolId,
    userPoolWebClientId: config.userPoolWebClientId,
    oauth: {
      ...awsConfig.Auth.oauth,
      domain: config.cognitoDomain || awsConfig.Auth.oauth.domain,
      redirectSignIn: config.redirectSignIn || awsConfig.Auth.oauth.redirectSignIn,
      redirectSignOut: config.redirectSignOut || awsConfig.Auth.oauth.redirectSignOut,
    }
  });
  
  if (config.apiEndpoint) {
    awsConfig.API.endpoints[0].endpoint = config.apiEndpoint;
    awsConfig.API.endpoints[0].region = config.region;
  }
}