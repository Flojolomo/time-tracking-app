import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useAuth } from '../hooks/useAuth';
import { Button, Input, Error, Alert, PageHeader, Section, TabNavigation, LoadingSpinner } from '../components/ui';
import { LandingPage } from './LandingPage';
import { ProtectedRoute } from '../routes/ProtectedRoute';
import { apiRequest } from '../utils/apiClient';

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

interface ProfileData {
  name: string;
  email: string;
}

const ProfileContent = () => {
  const { user, logout, updateProfile, changePassword, requestPasswordReset, deleteProfile } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null); 
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [showPasswordReset, setShowPasswordReset] = useState(false);
  const [activeTab, setActiveTab] = useState<'profile' | 'password' | 'danger'>('profile');
  const [profileData, setProfileData] = useState<ProfileData | null>(null);

  // Profile form
  const profileForm = useForm<ProfileFormData>({
    defaultValues: {
      name: '',
      email: '',
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

  // Fetch profile data from backend
  const fetchProfile = async () => {
    try {
      setIsLoadingProfile(true);
      const response = await apiRequest<{ profile: any }>('/api/profile', { method: 'GET' });
      const profile = response.profile;
      
      const profileData = {
        name: `${profile.givenName || ''} ${profile.familyName || ''}`.trim() || profile.username || '',
        email: profile.email || '',
      };
      
      setProfileData(profileData);
      profileForm.reset(profileData);
    } catch (error: any) {
      console.error('Failed to fetch profile:', error);
      // Fallback to user data from auth
      if (user) {
        const fallbackData = {
          name: user.name || '',
          email: user.email || ''
        };
        setProfileData(fallbackData);
        profileForm.reset(fallbackData);
      }
    } finally {
      setIsLoadingProfile(false);
    }
  };

  // Load profile data on mount
  useEffect(() => {
    if (user) {
      fetchProfile();
      resetPasswordForm.reset({
        email: user.email || '',
      });
    }
  }, [user, resetPasswordForm]);

  // Update form values when profile data changes
  useEffect(() => {
    if (profileData) {
      profileForm.reset({
        name: profileData.name || '',
        email: profileData.email || '',
      });
    }
  }, [profileData, profileForm]);

  const clearMessages = () => {
    setError(null);
    setSuccess(null);
  };

  const handleProfileUpdate = async (data: ProfileFormData) => {
    try {
      setIsLoading(true);
      clearMessages();

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

      await deleteProfile();

      setSuccess('Profile deleted successfully. You will be logged out.');
      
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

  return (
    <LandingPage>
      <div className="space-y-4 sm:space-y-6">
        <PageHeader
          title="Profile Settings"
          description="Manage your account settings and preferences"
        />

        <div className="bg-white shadow rounded-lg">
          <TabNavigation
            tabs={[
              { id: 'profile', label: 'Profile Information' },
              { id: 'password', label: 'Password & Security' },
              { id: 'danger', label: 'Danger Zone', variant: 'danger' }
            ]}
            activeTab={activeTab}
            onTabChange={(tab) => setActiveTab(tab as 'profile' | 'password' | 'danger')}
          />

          <div className="p-6">
            {error && <Error message={error} className="mb-6" />}
            {success && <Alert type="success" message={success} className="mb-6" />}

            {activeTab === 'profile' && (
              <Section>
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Personal Information
                </h3>
                {isLoadingProfile ? (
                  <div className="flex items-center justify-center py-8">
                    <LoadingSpinner />
                    <span className="ml-2 text-gray-600">Loading profile...</span>
                  </div>
                ) : (
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
                    <p className="text-xs text-gray-500">
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
                )}
              </Section>
            )}

            {activeTab === 'password' && (
              <div className="space-y-8">
                <Section>
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
                          value: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]+$/,
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
                </Section>

                <Section>
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
                </Section>
              </div>
            )}

            {activeTab === 'danger' && (
              <Section className="border-red-200 bg-red-50">
                <h3 className="text-lg font-medium text-red-900 mb-4">
                  Danger Zone
                </h3>
                <div className="space-y-4">
                  <h4 className="text-base font-medium text-red-900">
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
                  )}
                </div>
              </Section>
            )}
          </div>
        </div>
      </div>
    </LandingPage>
  );
};

export function ProfilePage() {
  return (
    <ProtectedRoute>
      <ProfileContent />
    </ProtectedRoute>
  );
}