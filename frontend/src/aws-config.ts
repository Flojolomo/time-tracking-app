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
      version: "1",
      auth: {
        aws_region: "us-east-1",
        user_pool_id: "",
        user_pool_client_id: "",
        identity_pool_id: "",
        password_policy: {
          min_length: 8,
          require_lowercase: true,
          require_uppercase: true,
          require_numbers: true,
          require_symbols: true
        },
        oauth: {
          identity_providers: ["COGNITO"],
          domain: "",
          scopes: ["email", "openid", "profile"],
          redirect_sign_in_uri: ["http://localhost:3001/"],
          redirect_sign_out_uri: ["http://localhost:3001/"],
          response_type: "code"
        },
        username_attributes: ["email"],
        user_verification_types: ["email"]
      }
    };
  }
}

// Check if we're in development mode without proper AWS config
export function isDevelopmentMode(config?: any): boolean {
  if (!config) return true;
  return !config.auth.user_pool_id || !config.auth.user_pool_client_id;
}

// Validation function to ensure required config is present
export function validateAwsConfig(config: any): { isValid: boolean; missing: string[] } {
  const missing: string[] = [];
  
  if (!config?.auth?.user_pool_id) {
    missing.push('auth.user_pool_id');
  }
  
  if (!config?.auth?.user_pool_client_id) {
    missing.push('auth.user_pool_client_id');
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