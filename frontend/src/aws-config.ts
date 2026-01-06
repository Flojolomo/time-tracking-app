// AWS Amplify configuration using amplify_outputs.json
let amplifyOutputs: any = null;

// Fetch configuration from static file
async function loadAmplifyConfig() {
  if (amplifyOutputs) {
    return amplifyOutputs;
  }
  
  try {
    const response = await fetch('/amplify_outputs.json');
    if (!response.ok) {
      throw new Error(`Failed to load configuration: ${response.status}`);
    }
    amplifyOutputs = await response.json();
    return amplifyOutputs;
  } catch (error) {
    console.error('Failed to load AWS configuration:', error);
    // Return default configuration for development
    return {
      Auth: {
        Cognito: {
          userPoolId: "",
          userPoolClientId: "",
          identityPoolId: "",
          loginWith: {
            oauth: {
              domain: "",
              scopes: ['openid', 'email', 'profile'],
              redirectSignIn: ['http://localhost:3001/'],
              redirectSignOut: ['http://localhost:3001/'],
              responseType: 'code'
            },
            email: true,
            username: false
          },
          signUpVerificationMethod: 'code',
          userAttributes: {
            email: {
              required: true
            }
          },
          allowGuestAccess: false,
          passwordFormat: {
            minLength: 8,
            requireLowercase: true,
            requireUppercase: true,
            requireNumbers: true,
            requireSpecialCharacters: false
          }
        }
      }
    };
  }
}

// Check if we're in development mode without proper AWS config
export function isDevelopmentMode(config?: any): boolean {
  if (!config) return true;
  return !config.Auth?.Cognito?.userPoolId || !config.Auth?.Cognito?.userPoolClientId;
}

// Validation function to ensure required config is present
export function validateAwsConfig(config: any): { isValid: boolean; missing: string[] } {
  const missing: string[] = [];
  
  if (!config?.Auth?.Cognito?.userPoolId) {
    missing.push('Auth.Cognito.userPoolId');
  }
  
  if (!config?.Auth?.Cognito?.userPoolClientId) {
    missing.push('Auth.Cognito.userPoolClientId');
  }
  
  return {
    isValid: missing.length === 0,
    missing
  };
}

// Get the Amplify configuration
export async function getAmplifyConfig() {
  return await loadAmplifyConfig();
}

// Export the configuration loader
export { loadAmplifyConfig };