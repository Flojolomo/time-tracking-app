import './polyfills'
import React from 'react'
import ReactDOM from 'react-dom/client'
import { Amplify } from 'aws-amplify'
import { BrowserRouter } from 'react-router-dom'
import App from './App.tsx'
import { AuthProvider } from './hooks/useAuth'
import { getAmplifyConfig, validateAwsConfig } from './aws-config'
import './index.css'

// Initialize the app with async configuration loading
async function initializeApp() {
  try {
    // Load AWS Amplify configuration
    const amplifyConfig = await getAmplifyConfig();
    Amplify.configure(amplifyConfig);

    // Validate configuration in development
    if (import.meta.env.DEV) {
      const validation = validateAwsConfig(amplifyConfig);
      if (!validation.isValid) {
        console.warn('AWS configuration is incomplete:', validation.missing);
        console.warn('Please update public/amplify_outputs.json with your AWS Cognito configuration.');
      }
    }

    // Render the app
    ReactDOM.createRoot(document.getElementById('root')!).render(
      <React.StrictMode>
        <BrowserRouter>
          <AuthProvider>
            <App />
          </AuthProvider>
        </BrowserRouter>
      </React.StrictMode>,
    );
  } catch (error) {
    console.error('Failed to initialize app:', error);
    // Render error state
    ReactDOM.createRoot(document.getElementById('root')!).render(
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-6">
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
              <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h3 className="mt-2 text-sm font-medium text-gray-900">Configuration Error</h3>
            <p className="mt-1 text-sm text-gray-500">
              Failed to load AWS configuration. Please check that amplify_outputs.json is properly configured.
            </p>
          </div>
        </div>
      </div>
    );
  }
}

// Initialize the app
initializeApp();

// Register service worker in production
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  import('./utils/serviceWorker').then(({ registerServiceWorker }) => {
    registerServiceWorker();
  });
}