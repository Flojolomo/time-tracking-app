import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useAuth } from '../hooks/useAuth';
import { LoginCredentials } from '../types';
import { useLocation, Link } from 'react-router-dom';
import { Button, Input, Card, ErrorAlert, Alert } from './ui';

interface LoginFormProps {
  onSuccess?: () => void;
  onSwitchToSignup?: () => void;
}

export function LoginForm({ onSuccess, onSwitchToSignup }: LoginFormProps) {
  const { login, isLoading, error, clearError } = useAuth();
  const location = useLocation();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Check for success message from password reset redirect
  useEffect(() => {
    if (location.state?.message) {
      setSuccessMessage(location.state.message);
      // Clear the message from location state
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  // Clear errors when component mounts
  useEffect(() => {
    clearError();
    setSubmitError(null);
  }, [clearError]);
  
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting }
  } = useForm<LoginCredentials>();

  const onSubmit = async (data: LoginCredentials) => {
    try {
      setSubmitError(null);
      await login(data);
      onSuccess?.();
    } catch (error: unknown) {
      setSubmitError(error instanceof Error ? error.message : 'Login failed');
    }
  };

  const displayError = submitError || error;

  return (
    <Card 
      title="Sign In"
      icon={
        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m0 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
        </svg>
      }
    >
      {successMessage && (
        <Alert type="success" message={successMessage} />
      )}
      
      {displayError && (
        <ErrorAlert message={displayError} />
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input
          id="email"
          type="email"
          label="Email"
          placeholder="Enter your email"
          error={errors.email?.message}
          {...register('email', {
            required: 'Email is required',
            pattern: {
              value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
              message: 'Invalid email address'
            }
          })}
        />

        <Input
          id="password"
          type="password"
          label="Password"
          placeholder="Enter your password"
          error={errors.password?.message}
          {...register('password', {
            required: 'Password is required',
            minLength: {
              value: 8,
              message: 'Password must be at least 8 characters'
            }
          })}
        />

        <div className="flex justify-end space-x-3 mt-6">
          <Button
            type="submit"
            loading={isSubmitting || isLoading}
            loadingText="Signing In..."
          >
            Sign In
          </Button>
        </div>
      </form>

      <div className="mt-6 text-center">
        <Link
          to="/forgot-password"
          className="text-sm text-indigo-600 hover:text-indigo-500 font-medium"
        >
          Forgot your password?
        </Link>
      </div>

      {onSwitchToSignup && (
        <div className="mt-4 text-center">
          <p className="text-sm text-gray-600">
            Don't have an account?{' '}
            <button
              type="button"
              onClick={onSwitchToSignup}
              className="text-indigo-600 hover:text-indigo-500 font-medium"
            >
              Sign up
            </button>
          </p>
        </div>
      )}
    </Card>
  );
}