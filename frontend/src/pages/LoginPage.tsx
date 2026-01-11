import React from 'react';
import { LandingPage } from '.';
import { LoginForm } from '../components';

export const LoginPage: React.FC = () => {
  return (
    <LandingPage>
      <div className="py-12">
        <LoginForm 
          onSuccess={() => window.location.href = '/'} 
          onSwitchToSignup={() => window.location.href = '/signup'}
        />
      </div>
    </LandingPage>
  )
};

