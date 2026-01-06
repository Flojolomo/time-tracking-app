// TypeScript interfaces for runtime configuration

export interface AppConfig {
  aws: {
    region: string;
    cognito: {
      userPoolId: string;
      userPoolWebClientId: string;
      domain?: string;
    };
    api: {
      endpoint: string;
    };
  };
  app: {
    name: string;
    version: string;
    environment: 'development' | 'staging' | 'production';
  };
  features: {
    enableOAuth: boolean;
    enableMFA: boolean;
    enableAnalytics: boolean;
  };
  isDevelopmentMode(): boolean;
  validate(): {
    isValid: boolean;
    missing: string[];
  };
}

// Extend the Window interface to include our config
declare global {
  interface Window {
    APP_CONFIG: AppConfig;
  }
}