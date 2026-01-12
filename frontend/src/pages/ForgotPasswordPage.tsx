import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useAuth } from '../hooks/useAuth';
import { AuthLandingPage } from './AuthLandingPage';
import { Button, Input, Card, Error } from '../components/ui';

interface ForgotPasswordFormData {
  email: string;
}

interface ResetPasswordFormData {
  verificationCode: string;
  newPassword: string;
  confirmPassword: string;
}

const ForgotPasswordContent: React.FC = () => {
  const { requestPasswordReset, confirmPasswordReset } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState<'request' | 'reset' | 'success'>('request');
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register: registerRequest,
    handleSubmit: handleSubmitRequest,
    formState: { errors: requestErrors }
  } = useForm<ForgotPasswordFormData>();

  const {
    register: registerReset,
    handleSubmit: handleSubmitReset,
    watch,
    formState: { errors: resetErrors }
  } = useForm<ResetPasswordFormData>();

  const newPassword = watch('newPassword');

  const onSubmitRequest = async (data: ForgotPasswordFormData) => {
    try {
      setError(null);
      setIsLoading(true);
      await requestPasswordReset(data.email);
      setEmail(data.email);
      setStep('reset');
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : 'Password reset request failed');
    } finally {
      setIsLoading(false);
    }
  };

  const onSubmitReset = async (data: ResetPasswordFormData) => {
    try {
      setError(null);
      setIsLoading(true);
      await confirmPasswordReset(email, data.verificationCode, data.newPassword);
      setStep('success');
    } catch (error: unknown) {
      let errorMessage = 'Password reset failed. Please try again.';
      
      if (error && typeof error === 'object' && 'name' in error) {
        const namedError = error as { name: string; message?: string };
        if (namedError.name === 'CodeMismatchException') {
          errorMessage = 'Invalid verification code. Please check your email and try again.';
        } else if (namedError.name === 'ExpiredCodeException') {
          errorMessage = 'Verification code has expired. Please request a new password reset.';
        } else if (namedError.name === 'InvalidPasswordException') {
          errorMessage = 'Password does not meet requirements. Please choose a stronger password.';
        } else if (namedError.name === 'UserNotFoundException') {
          errorMessage = 'User not found. Please check your email and try again.';
        } else if (namedError.message) {
          errorMessage = namedError.message;
        }
      }
      
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  if (step === 'success') {
    return (
      <Card 
        title="Password Reset Successful"
        icon={
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        }
        variant="success"
      >
        <div className="text-center">
          <p className="text-gray-600 mb-6">
            Your password has been successfully reset. You can now sign in with your new password.
          </p>
          <Button onClick={() => navigate('/login')}>
            Go to Login
          </Button>
        </div>
      </Card>
    );
  }

  if (step === 'reset') {
    return (
      <Card 
        title="Enter Verification Code"
        icon={
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
          </svg>
        }
      >
        <p className="text-gray-600 mb-4">
          We've sent a verification code to <strong>{email}</strong>. 
          Please check your email and enter the code below.
        </p>

        {error && <Error message={error} />}

        <form onSubmit={handleSubmitReset(onSubmitReset)} className="space-y-4">
          <Input
            id="verificationCode"
            type="text"
            label="Verification Code"
            placeholder="000000"
            className="text-center text-lg tracking-widest"
            maxLength={6}
            error={resetErrors.verificationCode?.message}
            {...registerReset('verificationCode', {
              required: 'Verification code is required',
              pattern: {
                value: /^\d{6}$/,
                message: 'Verification code must be 6 digits'
              }
            })}
          />

          <Input
            id="newPassword"
            type="password"
            label="New Password"
            placeholder="Enter your new password"
            error={resetErrors.newPassword?.message}
            {...registerReset('newPassword', {
              required: 'New password is required',
              minLength: {
                value: 8,
                message: 'Password must be at least 8 characters'
              },
              pattern: {
                value: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
                message: 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
              }
            })}
          />

          <Input
            id="confirmPassword"
            type="password"
            label="Confirm New Password"
            placeholder="Confirm your new password"
            error={resetErrors.confirmPassword?.message}
            {...registerReset('confirmPassword', {
              required: 'Please confirm your password',
              validate: (value) => 
                value === newPassword || 'Passwords do not match'
            })}
          />

          <div className="flex justify-end space-x-3 mt-6">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setStep('request')}
            >
              Back
            </Button>
            <Button
              type="submit"
              loading={isLoading}
              loadingText="Resetting Password..."
            >
              Reset Password
            </Button>
          </div>
        </form>
      </Card>
    );
  }

  return (
    <Card 
      title="Reset Password"
      icon={
        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1721 9z" />
        </svg>
      }
    >
      <p className="text-gray-600 mb-4">
        Enter your email address and we'll send you a verification code to reset your password.
      </p>

      {error && <Error message={error} />}

      <form onSubmit={handleSubmitRequest(onSubmitRequest)} className="space-y-4">
        <Input
          id="email"
          type="email"
          label="Email Address"
          placeholder="Enter your email"
          error={requestErrors.email?.message}
          {...registerRequest('email', {
            required: 'Email is required',
            pattern: {
              value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
              message: 'Invalid email address'
            }
          })}
        />

        <div className="flex justify-end space-x-3 mt-6">
          <Button
            type="button"
            variant="secondary"
            onClick={() => navigate('/login')}
          >
            Back to Login
          </Button>
          <Button
            type="submit"
            loading={isLoading}
            loadingText="Sending Code..."
          >
            Send Reset Code
          </Button>
        </div>
      </form>
    </Card>
  );
};

export const ForgotPasswordPage: React.FC = () => {
  return (
    <AuthLandingPage>
      <ForgotPasswordContent />
    </AuthLandingPage>
  );
};