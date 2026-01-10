import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { confirmResetPassword } from 'aws-amplify/auth';
import { getAmplifyConfig, isDevelopmentMode } from '../aws-config';

interface PasswordResetFormData {
  newPassword: string;
  confirmPassword: string;
}

export function PasswordResetPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [config, setConfig] = useState<any>(null);
  
  // Extract token and email from URL parameters
  const token = searchParams.get('token') || searchParams.get('code');
  const email = searchParams.get('email') || searchParams.get('username');

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting }
  } = useForm<PasswordResetFormData>();

  const newPassword = watch('newPassword');

  useEffect(() => {
    // Load configuration
    const loadConfig = async () => {
      const amplifyConfig = await getAmplifyConfig();
      setConfig(amplifyConfig);
    };
    loadConfig();
  }, []);

  useEffect(() => {
    // Validate that we have the required parameters
    if (!token || !email) {
      setError('Invalid password reset link. Please request a new password reset.');
    }
  }, [token, email]);

  const onSubmit = async (data: PasswordResetFormData) => {
    if (!token || !email) {
      setError('Invalid password reset link. Please request a new password reset.');
      return;
    }

    try {
      setError(null);
      setIsLoading(true);
      
      // Check if AWS is configured
      if (!config || isDevelopmentMode(config)) {
        throw new Error('AWS Cognito not configured. Please update public/amplify_outputs.json with your AWS credentials.');
      }

      // Confirm the password reset using AWS Amplify
      await confirmResetPassword({
        username: email,
        confirmationCode: token,
        newPassword: data.newPassword,
      });

      setSuccess(true);
      
      // Redirect to login after 3 seconds
      setTimeout(() => {
        navigate('/login', { 
          state: { message: 'Password reset successful. Please sign in with your new password.' }
        });
      }, 3000);

    } catch (error: any) {
      console.error('Password reset error:', error);
      
      let errorMessage = 'Password reset failed. Please try again.';
      
      if (error.name === 'CodeMismatchException') {
        errorMessage = 'Invalid or expired reset code. Please request a new password reset.';
      } else if (error.name === 'ExpiredCodeException') {
        errorMessage = 'Reset code has expired. Please request a new password reset.';
      } else if (error.name === 'InvalidPasswordException') {
        errorMessage = 'Password does not meet requirements. Please choose a stronger password.';
      } else if (error.name === 'UserNotFoundException') {
        errorMessage = 'User not found. Please check your email and try again.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Show success message
  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <div className="mx-auto h-12 w-12 text-green-600">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
              Password Reset Successful
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              Your password has been successfully reset. You will be redirected to the login page shortly.
            </p>
            <div className="mt-4">
              <Link
                to="/login"
                className="text-indigo-600 hover:text-indigo-500 font-medium"
              >
                Go to Login →
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show error if missing required parameters
  if (!token || !email) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <div className="mx-auto h-12 w-12 text-red-600">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
              Invalid Reset Link
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              This password reset link is invalid or has expired. Please request a new password reset.
            </p>
            <div className="mt-4">
              <Link
                to="/login"
                className="text-indigo-600 hover:text-indigo-500 font-medium"
              >
                Back to Login
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <Link to="/" className="flex justify-center">
            <span className="text-2xl font-bold text-indigo-600">TimeTracker</span>
          </Link>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Reset Your Password
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Enter your new password below
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-1">
                New Password
              </label>
              <input
                id="newPassword"
                type="password"
                {...register('newPassword', {
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
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Enter your new password"
              />
              {errors.newPassword && (
                <p className="mt-1 text-sm text-red-600">{errors.newPassword.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                Confirm New Password
              </label>
              <input
                id="confirmPassword"
                type="password"
                {...register('confirmPassword', {
                  required: 'Please confirm your password',
                  validate: (value) => 
                    value === newPassword || 'Passwords do not match'
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Confirm your new password"
              />
              {errors.confirmPassword && (
                <p className="mt-1 text-sm text-red-600">{errors.confirmPassword.message}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={isSubmitting || isLoading}
              className="w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting || isLoading ? 'Resetting Password...' : 'Reset Password'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <Link
              to="/login"
              className="text-sm text-indigo-600 hover:text-indigo-500 font-medium"
            >
              Back to Login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}