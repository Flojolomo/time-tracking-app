import React from 'react'
import ReactDOM from 'react-dom/client'
import { Amplify } from 'aws-amplify'
import { BrowserRouter } from 'react-router-dom'
import App from './App.tsx'
import { AuthProvider } from './hooks/useAuth'
import { awsConfig, validateAwsConfig } from './aws-config'
import './index.css'

// Configure AWS Amplify
Amplify.configure(awsConfig)

// Validate configuration in development
if (import.meta.env.DEV && !validateAwsConfig()) {
  console.warn('AWS configuration is incomplete. Some features may not work properly.')
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