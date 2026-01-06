import './polyfills'
import React from 'react'
import ReactDOM from 'react-dom/client'
import { Amplify } from 'aws-amplify'
import { BrowserRouter } from 'react-router-dom'
import App from './App.tsx'
import { AuthProvider } from './hooks/useAuth'
import { getAmplifyConfig, validateAwsConfig, isDevelopmentMode } from './aws-config'
import './index.css'

// Configure AWS Amplify with amplify_outputs.json
const amplifyConfig = getAmplifyConfig();
Amplify.configure(amplifyConfig);

// Validate configuration in development
if (import.meta.env.DEV) {
  const validation = validateAwsConfig();
  if (!validation.isValid) {
    console.warn('AWS configuration is incomplete:', validation.missing);
    console.warn('Please update amplify_outputs.json with your AWS Cognito configuration.');
  }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>,
)