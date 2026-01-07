// AWS Amplify Gen 2 configuration
let amplifyConfig: any = null;

// Fetch configuration from static file
async function loadAmplifyConfig() {
  if (amplifyConfig) {
    return amplifyConfig;
  }
  
  try {
    const response = await fetch('/amplify_outputs.json');
    if (!response.ok) {
      throw new Error(`Failed to load configuration: ${response.status}`);
    }
    const config = await response.json();
    
    // Transform the configuration to include REST API settings
    amplifyConfig = {
      Auth: {
        Cognito: {
          userPoolId: config.auth?.user_pool_id || '',
          userPoolClientId: config.auth?.user_pool_client_id || '',
          identityPoolId: config.auth?.identity_pool_id || '',
          loginWith: {
            oauth: config.auth?.oauth ? {
              domain: config.auth.oauth.domain,
              scopes: config.auth.oauth.scopes || ['email', 'openid', 'profile'],
              redirectSignIn: config.auth.oauth.redirect_sign_in_uri || ['http://localhost:3001/'],
              redirectSignOut: config.auth.oauth.redirect_sign_out_uri || ['http://localhost:3001/'],
              responseType: config.auth.oauth.response_type || 'code',
              providers: config.auth.oauth.identity_providers || ['COGNITO']
            } : undefined,
            email: config.auth?.username_attributes?.includes('email') || false,
          },
          signUpVerificationMethod: 'code',
          userAttributes: {
            email: {
              required: true,
            },
          },
          allowGuestAccess: false,
          passwordFormat: {
            minLength: config.auth?.password_policy?.min_length || 8,
            requireLowercase: config.auth?.password_policy?.require_lowercase || true,
            requireUppercase: config.auth?.password_policy?.require_uppercase || true,
            requireNumbers: config.auth?.password_policy?.require_numbers || true,
            requireSpecialCharacters: config.auth?.password_policy?.require_symbols || false,
          },
        },
      },
      API: {
        REST: config.custom?.API || {},
      },
    };
    
    return amplifyConfig;
  } catch (error) {
    console.error('Failed to load AWS configuration:', error);
    // Return default configuration for development
    return {
      Auth: {
        Cognito: {
          userPoolId: '',
          userPoolClientId: '',
          identityPoolId: '',
          loginWith: {
            email: true,
          },
          signUpVerificationMethod: 'code',
          userAttributes: {
            email: {
              required: true,
            },
          },
          allowGuestAccess: false,
          passwordFormat: {
            minLength: 8,
            requireLowercase: true,
            requireUppercase: true,
            requireNumbers: true,
            requireSpecialCharacters: false,
          },
        },
      },
      API: {
        REST: {},
      },
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