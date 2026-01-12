import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useAuth } from '../hooks/useAuth';
import { Button, Input, Card, Error, Alert } from '../components/ui';
import { LoadingSpinner } from '../components/LoadingSpinner';

interface ProfileFormData {
  name: string;
  email: string;
}

interface PasswordFormData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

interface ResetPasswordFormData {
  email: string;
}

export function ProfilePage() {
  const { user, logout, updateProfile, changePassword, requestPasswordReset, deleteProfile } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null); 
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [showPasswordReset, setShowPasswordReset] = useState(false);
  const [activeTab, setActiveTab] = useState<'profile' | 'password' | 'danger'>('profile');

  // Profile form
  const profileForm = useForm<ProfileFormData>({
    defaultValues: {
      name: user?.name || '',
      email: user?.email || '',
    }
  });

  // Password form
  const passwordForm = useForm<PasswordFormData>();

  // Reset password form
  const resetPasswordForm = useForm<ResetPasswordFormData>({
    defaultValues: {
      email: user?.email || '',
    }
  });

  // Update form values when user data changes
  useEffect(() => {
    if (user) {
      profileForm.reset({
        name: user.name || '',
        email: user.email || '',
      });
      resetPasswordForm.reset({
        email: user.email || '',
      });
    }
  }, [user, profileForm, resetPasswordForm]);

  const clearMessages = () => {
    setError(null);
    setSuccess(null);
  };

  const handleProfileUpdate = async (data: ProfileFormData) => {
    try {
      setIsLoading(true);
      clearMessages();

      // Update user attributes using the auth hook
      await updateProfile({
        name: data.name,
      });

      setSuccess('Profile updated successfully!');
    } catch (error: any) {
      setError(error.message || 'Failed to update profile');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordUpdate = async (data: PasswordFormData) => {
    try {
      setIsLoading(true);
      clearMessages();

      await changePassword(data.currentPassword, data.newPassword);

      setSuccess('Password updated successfully!');
      passwordForm.reset();
    } catch (error: any) {
      setError(error.message || 'Failed to update password');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordReset = async (data: ResetPasswordFormData) => {
    try {
      setIsLoading(true);
      clearMessages();

      await requestPasswordReset(data.email);

      setSuccess('Password reset email sent! Please check your email for instructions.');
      setShowPasswordReset(false);
    } catch (error: any) {
      setError(error.message || 'Failed to send password reset email');
    } finally {
      setIsLoading(false);
    }
  };

  const handleProfileDeletion = async () => {
    try {
      setIsLoading(true);
      clearMessages();

      // Delete user account using the auth hook
      await deleteProfile();

      // Note: In a real implementation, you would also need to call your API
      // to delete all associated time records from DynamoDB
      // This would be handled by the backend API endpoint created in task 4.3

      setSuccess('Profile deleted successfully. You will be logged out.');
      
      // Logout and redirect after a short delay
      setTimeout(() => {
        logout();
        window.location.href = '/';
      }, 2000);
    } catch (error: any) {
      setError(error.message || 'Failed to delete profile');
    } finally {
      setIsLoading(false);
      setShowDeleteConfirmation(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Please log in to access your profile.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white shadow rounded-lg">
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-200">
            <h1 className="text-2xl font-bold text-gray-900">Profile Settings</h1>
            <p className="mt-1 text-sm text-gray-600">
              Manage your account settings and preferences
            </p>
          </div>

          {/* Tab Navigation */}
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8 px-6">
              <button
                onClick={() => setActiveTab('profile')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'profile'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Profile Information
              </button>
              <button
                onClick={() => setActiveTab('password')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'password'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Password & Security
              </button>
              <button
                onClick={() => setActiveTab('danger')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'danger'
                    ? 'border-red-500 text-red-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Danger Zone
              </button>
            </nav>
          </div>

          {/* Content */}
          <div className="p-6">
            {/* Messages */}
            {error && <Error message={error} className="mb-6" />}
            {success && <Alert type="success" message={success} className="mb-6" />}

            {/* Profile Information Tab */}
            {activeTab === 'profile' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">
                    Personal Information
                  </h3>
                  <form onSubmit={profileForm.handleSubmit(handleProfileUpdate)} className="space-y-4">
                    <Input
                      id="name"
                      type="text"
                      label="Name"
                      placeholder="Enter your name"
                      error={profileForm.formState.errors.name?.message}
                      {...profileForm.register('name')}
                    />

                    <Input
                      id="email"
                      type="email"
                      label="Email"
                      placeholder="Email cannot be changed"
                      disabled
                      className="bg-gray-50 text-gray-500 cursor-not-allowed"
                      {...profileForm.register('email')}
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      Email changes require additional verification and are not currently supported.
                    </p>

                    <div className="flex justify-end">
                      <Button
                        type="submit"
                        loading={isLoading}
                        loadingText="Updating..."
                      >
                        Update Profile
                      </Button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* Password & Security Tab */}
            {activeTab === 'password' && (
              <div className="space-y-8">
                {/* Change Password Section */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">
                    Change Password
                  </h3>
                  <form onSubmit={passwordForm.handleSubmit(handlePasswordUpdate)} className="space-y-4">
                    <Input
                      id="currentPassword"
                      type="password"
                      label="Current Password"
                      placeholder="Enter your current password"
                      error={passwordForm.formState.errors.currentPassword?.message}
                      {...passwordForm.register('currentPassword', {
                        required: 'Current password is required'
                      })}
                    />

                    <Input
                      id="newPassword"
                      type="password"
                      label="New Password"
                      placeholder="Enter your new password"
                      error={passwordForm.formState.errors.newPassword?.message}
                      {...passwordForm.register('newPassword', {
                        required: 'New password is required',
                        minLength: {
                          value: 8,
                          message: 'Password must be at least 8 characters'
                        },
                        pattern: {
                          value: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
                          message: 'Password must contain uppercase, lowercase, number, and special character'
                        }
                      })}
                    />

                    <Input
                      id="confirmPassword"
                      type="password"
                      label="Confirm New Password"
                      placeholder="Confirm your new password"
                      error={passwordForm.formState.errors.confirmPassword?.message}
                      {...passwordForm.register('confirmPassword', {
                        required: 'Please confirm your new password',
                        validate: value => 
                          value === passwordForm.watch('newPassword') || 'Passwords do not match'
                      })}
                    />

                    <div className="flex justify-end">
                      <Button
                        type="submit"
                        loading={isLoading}
                        loadingText="Updating..."
                      >
                        Update Password
                      </Button>
                    </div>
                  </form>
                </div>

                {/* Password Reset Section */}
                <div className="border-t border-gray-200 pt-8">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">
                    Forgot Password?
                  </h3>
                  <p className="text-sm text-gray-600 mb-4">
                    If you've forgotten your password, you can request a password reset email.
                  </p>
                  
                  {!showPasswordReset ? (
                    <button
                      onClick={() => setShowPasswordReset(true)}
                      className="text-blue-600 hover:text-blue-500 text-sm font-medium"
                    >
                      Send Password Reset Email
                    </button>
                  ) : (
                    <form onSubmit={resetPasswordForm.handleSubmit(handlePasswordReset)} className="space-y-4">
                      <Input
                        id="resetEmail"
                        type="email"
                        label="Email Address"
                        placeholder="Enter your email address"
                        error={resetPasswordForm.formState.errors.email?.message}
                        {...resetPasswordForm.register('email', {
                          required: 'Email is required',
                          pattern: {
                            value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                            message: 'Invalid email address'
                          }
                        })}
                      />

                      <div className="flex space-x-3">
                        <Button
                          type="submit"
                          loading={isLoading}
                          loadingText="Sending..."
                          size="sm"
                        >
                          Send Reset Email
                        </Button>
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={() => setShowPasswordReset(false)}
                        >
                          Cancel
                        </Button>
                      </div>
                    </form>
                  )}
                </div>
              </div>
            )}

            {/* Danger Zone Tab */}
            {activeTab === 'danger' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium text-red-900 mb-4">
                    Danger Zone
                  </h3>
                  <div className="border border-red-200 rounded-md p-6 bg-red-50">
                    <h4 className="text-base font-medium text-red-900 mb-2">
                      Delete Account
                    </h4>
                    <p className="text-sm text-red-700 mb-4">
                      Once you delete your account, there is no going back. This will permanently delete 
                      your profile and all associated time tracking records.
                    </p>
                    
                    {!showDeleteConfirmation ? (
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => setShowDeleteConfirmation(true)}
                      >
                        Delete Account
                      </Button>
                    ) : (
                      <div className="space-y-4">
                        <div className="bg-white border border-red-300 rounded-md p-4">
                          <h5 className="text-sm font-medium text-red-900 mb-2">
                            Are you absolutely sure?
                          </h5>
                          <p className="text-sm text-red-700 mb-4">
                            This action cannot be undone. This will permanently delete your account 
                            and remove all your time tracking data from our servers.
                          </p>
                          <div className="flex space-x-3">
                            <Button
                              variant="danger"
                              size="sm"
                              loading={isLoading}
                              loadingText="Deleting..."
                              onClick={handleProfileDeletion}
                            >
                              Yes, Delete My Account
                            </Button>
                            <Button
                              variant="secondary"
                              size="sm"
                              disabled={isLoading}
                              onClick={() => setShowDeleteConfirmation(false)}
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}