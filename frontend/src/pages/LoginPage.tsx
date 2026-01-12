import React from 'react';
import { AuthLandingPage } from './AuthLandingPage';
import { LoginForm } from '../components';

export const LoginPage: React.FC = () => {
  return (
    <AuthLandingPage>
      <LoginForm 
        onSuccess={() => window.location.href = '/'} 
        onSwitchToSignup={() => window.location.href = '/signup'}
      />
    </AuthLandingPage>
  )
};

