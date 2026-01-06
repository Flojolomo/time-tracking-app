// AWS Amplify configuration using standard Amplify v5 format
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
    amplifyConfig = await response.json();
    return amplifyConfig;
  } catch (error) {
    console.error('Failed to load AWS configuration:', error);
    // Return default configuration for development
    return {
      aws_project_region: "us-east-1",
      aws_cognito_region: "us-east-1",
      aws_user_pools_id: "",
      aws_user_pools_web_client_id: "",
      aws_cognito_identity_pool_id: "",
      oauth: {
        domain: "",
        scope: ["email", "openid", "profile"],
        redirectSignIn: "http://localhost:3001/",
        redirectSignOut: "http://localhost:3001/",
        responseType: "code"
      },
      federationTarget: "COGNITO_USER_POOLS",
      aws_cognito_username_attributes: ["EMAIL"],
      aws_cognito_social_providers: [],
      aws_cognito_signup_attributes: ["EMAIL"],
      aws_cognito_mfa_configuration: "OFF",
      aws_cognito_mfa_types: ["SMS"],
      aws_cognito_password_protection_settings: {
        passwordPolicyMinLength: 8,
        passwordPolicyCharacters: ["REQUIRES_LOWERCASE", "REQUIRES_UPPERCASE", "REQUIRES_NUMBERS"]
      },
      aws_cognito_verification_mechanisms: ["EMAIL"]
    };
  }
}

// Check if we're in development mode without proper AWS config
export function isDevelopmentMode(config?: any): boolean {
  if (!config) return true;
  return !config.aws_user_pools_id || !config.aws_user_pools_web_client_id;
}

// Validation function to ensure required config is present
export function validateAwsConfig(config: any): { isValid: boolean; missing: string[] } {
  const missing: string[] = [];
  
  if (!config?.aws_user_pools_id) {
    missing.push('aws_user_pools_id');
  }
  
  if (!config?.aws_user_pools_web_client_id) {
    missing.push('aws_user_pools_web_client_id');
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