import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useAuth } from '../hooks/useAuth';
import { SignupCredentials } from '../types';
import { Button, Input, Card, ErrorAlert } from './ui';

interface SignupFormProps {
  onSuccess?: () => void;
  onSwitchToLogin?: () => void;
}

export function SignupForm({ onSuccess, onSwitchToLogin }: SignupFormProps) {
  const { signup, isLoading, error, clearError } = useAuth();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSignupComplete, setIsSignupComplete] = useState(false);
  
  // Clear errors when component mounts
  useEffect(() => {
    clearError();
    setSubmitError(null);
  }, [clearError]);
  
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    watch
  } = useForm<SignupCredentials & { confirmPassword: string }>();

  const password = watch('password');

  const onSubmit = async (data: SignupCredentials & { confirmPassword: string }) => {
    try {
      setSubmitError(null);
      await signup({
        email: data.email,
        password: data.password,
        name: data.name
      });
      setIsSignupComplete(true);
      onSuccess?.();
    } catch (error: unknown) {
      setSubmitError(error instanceof Error ? error.message : 'Signup failed');
    }
  };

  const displayError = submitError || error;

  if (isSignupComplete) {
    return (
      <Card 
        title="Check Your Email"
        icon={
          <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        }
        variant="success"
      >
        <div className="text-center">
          <p className="text-gray-600 mb-6">
            We've sent a verification link to your email address. Please check your email and click the link to verify your account.
          </p>
          {onSwitchToLogin && (
            <Button variant="secondary" onClick={onSwitchToLogin}>
              Back to Sign In
            </Button>
          )}
        </div>
      </Card>
    );
  }

  return (
    <Card 
      title="Create Account"
      icon={
        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
        </svg>
      }
    >
      {displayError && <ErrorAlert message={displayError} />}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input
          id="name"
          type="text"
          label="Name (Optional)"
          placeholder="Enter your name"
          {...register('name')}
        />

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
            },
            pattern: {
              value: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]+$/,
              message: 'Password must contain uppercase, lowercase, number, and special character'
            }
          })}
        />

        <Input
          id="confirmPassword"
          type="password"
          label="Confirm Password"
          placeholder="Confirm your password"
          error={errors.confirmPassword?.message}
          {...register('confirmPassword', {
            required: 'Please confirm your password',
            validate: value => value === password || 'Passwords do not match'
          })}
        />

        <Button
          type="submit"
          loading={isSubmitting || isLoading}
          loadingText="Creating Account..."
          className="w-full"
        >
          Create Account
        </Button>
      </form>

      {onSwitchToLogin && (
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            Already have an account?{' '}
            <button
              type="button"
              onClick={onSwitchToLogin}
              className="text-blue-600 hover:text-blue-500 font-medium"
            >
              Sign in
            </button>
          </p>
        </div>
      )}
    </Card>
  );
}