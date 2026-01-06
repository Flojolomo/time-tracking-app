// AWS Amplify configuration using runtime config
import type { AppConfig } from './types/config';

// Function to get runtime configuration
function getRuntimeConfig(): AppConfig {
  if (typeof window !== 'undefined' && window.APP_CONFIG) {
    return window.APP_CONFIG;
  }
  
  // Fallback configuration for SSR or when config is not loaded
  return {
    aws: {
      region: 'us-east-1',
      cognito: {
        userPoolId: '',
        userPoolWebClientId: '',
        domain: ''
      },
      api: {
        endpoint: ''
      }
    },
    app: {
      name: 'Time Tracking App',
      version: '1.0.0',
      environment: 'development'
    },
    features: {
      enableOAuth: false,
      enableMFA: false,
      enableAnalytics: false
    },
    isDevelopmentMode: () => true,
    validate: () => ({ isValid: false, missing: ['runtime config not loaded'] })
  };
}

// Generate AWS Amplify configuration from runtime config
export function getAwsConfig() {
  const config = getRuntimeConfig();
  
  return {
    Auth: {
      region: config.aws.region,
      userPoolId: config.aws.cognito.userPoolId,
      userPoolWebClientId: config.aws.cognito.userPoolWebClientId,
      mandatorySignIn: true,
      authenticationFlowType: 'USER_SRP_AUTH',
      ...(config.features.enableOAuth && config.aws.cognito.domain && {
        oauth: {
          domain: config.aws.cognito.domain,
          scope: ['email', 'profile', 'openid'],
          redirectSignIn: `${window.location.origin}/`,
          redirectSignOut: `${window.location.origin}/`,
          responseType: 'code'
        }
      })
    },
    ...(config.aws.api.endpoint && {
      API: {
        endpoints: [
          {
            name: 'timetracking',
            endpoint: config.aws.api.endpoint,
            region: config.aws.region
          }
        ]
      }
    })
  };
}

// Validation function to ensure required config is present
export function validateAwsConfig(): { isValid: boolean; missing: string[] } {
  const config = getRuntimeConfig();
  return config.validate();
}

// Check if we're in development mode without proper AWS config
export function isDevelopmentMode(): boolean {
  const config = getRuntimeConfig();
  return config.isDevelopmentMode();
}

// Get the runtime configuration
export function getConfig(): AppConfig {
  return getRuntimeConfig();
}