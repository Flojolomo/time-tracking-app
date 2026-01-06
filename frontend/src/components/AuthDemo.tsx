import { useState } from 'react';
import { LoginForm } from './LoginForm';
import { SignupForm } from './SignupForm';
import { useAuth } from '../hooks/useAuth';

export function AuthDemo() {
  const [currentView, setCurrentView] = useState<'login' | 'signup'>('login');
  const { user, logout, isAuthenticated } = useAuth();

  if (isAuthenticated && user) {
    return (
      <div className="max-w-md mx-auto bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4 text-center">
          Welcome!
        </h2>
        <div className="text-center">
          <p className="text-gray-600 mb-4">
            Hello, {user.name || user.email}!
          </p>
          <p className="text-sm text-gray-500 mb-6">
            You are successfully authenticated.
          </p>
          <button
            onClick={logout}
            className="w-full bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
          >
            Sign Out
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {currentView === 'login' ? (
        <LoginForm
          onSuccess={() => {
            // User will be automatically redirected by the auth state change
          }}
          onSwitchToSignup={() => setCurrentView('signup')}
        />
      ) : (
        <SignupForm
          onSuccess={() => {
            // Show success message, user can now login
            setCurrentView('login');
          }}
          onSwitchToLogin={() => setCurrentView('login')}
        />
      )}
    </div>
  );
}