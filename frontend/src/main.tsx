import './polyfills'
import React from 'react'
import ReactDOM from 'react-dom/client'
import { Amplify } from 'aws-amplify'
import { BrowserRouter } from 'react-router-dom'
import App from './App.tsx'
import { AuthProvider } from './hooks/useAuth'
import { awsConfig, validateAwsConfig, isDevelopmentMode } from './aws-config'
import './index.css'

// Configure AWS Amplify only if we have proper configuration
if (!isDevelopmentMode()) {
  Amplify.configure(awsConfig)
}

// Validate configuration in development
if (import.meta.env.DEV) {
  if (!validateAwsConfig()) {
    console.warn('AWS configuration is incomplete. Authentication features will be limited.')
    console.warn('To enable full authentication, create a .env file with your AWS Cognito configuration.')
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