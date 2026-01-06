// AWS Amplify configuration using amplify_outputs.json
import amplifyOutputs from '../amplify_outputs.json';

// Check if we're in development mode without proper AWS config
export function isDevelopmentMode(): boolean {
  return !amplifyOutputs.auth.user_pool_id || !amplifyOutputs.auth.user_pool_client_id;
}

// Validation function to ensure required config is present
export function validateAwsConfig(): { isValid: boolean; missing: string[] } {
  const missing: string[] = [];
  
  if (!amplifyOutputs.auth.user_pool_id) {
    missing.push('auth.user_pool_id');
  }
  
  if (!amplifyOutputs.auth.user_pool_client_id) {
    missing.push('auth.user_pool_client_id');
  }
  
  return {
    isValid: missing.length === 0,
    missing
  };
}

// Get the Amplify configuration
export function getAmplifyConfig() {
  return amplifyOutputs;
}

// Export the configuration for direct use
export { amplifyOutputs };