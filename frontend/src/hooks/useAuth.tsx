import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { signIn, signUp, signOut, getCurrentUser, fetchAuthSession, fetchUserAttributes, updatePassword, updateUserAttributes, deleteUser, resetPassword, confirmResetPassword } from 'aws-amplify/auth';
import { AuthUser, LoginCredentials, SignupCredentials, AuthContextType } from '../types';
import { getAmplifyConfig, isDevelopmentMode } from '../aws-config';

// Create Auth Context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Auth Provider Component
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [config, setConfig] = useState<any>(null);

  // Load configuration and check auth state on app load
  useEffect(() => {
    initializeAuth();
  }, []);

  const initializeAuth = async () => {
    try {
      setIsLoading(true);
      
      // Load configuration
      const amplifyConfig = await getAmplifyConfig();
      setConfig(amplifyConfig);
      
      // If in development mode without AWS config, skip auth check
      if (isDevelopmentMode(amplifyConfig)) {
        setUser(null);
        setError('AWS Cognito not configured. Please update public/amplify_outputs.json with your AWS credentials.');
        return;
      }

      const currentUser = await getCurrentUser();
      const session = await fetchAuthSession();
      const userAttributes = await fetchUserAttributes();
      
      // Ensure we have both Cognito user and AWS credentials
      if (!session.credentials || !session.identityId) {
        console.warn('Missing AWS credentials or identity ID');
        setUser(null);
        return;
      }
      
      setUser({
        userId: currentUser.userId,
        email: currentUser.signInDetails?.loginId || '',
        name: userAttributes.given_name || userAttributes.name || currentUser.signInDetails?.loginId || '',
        accessToken: session.tokens?.accessToken?.toString() || ''
      });
    } catch (error) {
      // User is not authenticated or AWS not configured
      setUser(null);
      if (config && isDevelopmentMode(config)) {
        setError('AWS Cognito not configured. Please update public/amplify_outputs.json with your AWS Cognito settings.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (credentials: LoginCredentials) => {
    try {
      setError(null);
      setIsLoading(true);
      
      // Check if AWS is configured
      if (!config || isDevelopmentMode(config)) {
        throw new Error('AWS Cognito not configured. Please update public/amplify_outputs.json with your AWS credentials.');
      }
      
      const { isSignedIn } = await signIn({
        username: credentials.email,
        password: credentials.password,
      });
      
      if (isSignedIn) {
        const currentUser = await getCurrentUser();
        const session = await fetchAuthSession();
        const userAttributes = await fetchUserAttributes();
        
        // Ensure we have both Cognito user and AWS credentials
        if (!session.credentials || !session.identityId) {
          throw new Error('Failed to obtain AWS credentials. Please try logging in again.');
        }
        
        setUser({
          userId: currentUser.userId,
          email: currentUser.signInDetails?.loginId || '',
          name: userAttributes.given_name || userAttributes.name || currentUser.signInDetails?.loginId || '',
          accessToken: session.tokens?.accessToken?.toString() || ''
        });
      }
    } catch (error: any) {
      const errorMessage = error.message || 'Login failed';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const signup = async (credentials: SignupCredentials) => {
    try {
      setError(null);
      setIsLoading(true);
      
      // Check if AWS is configured
      if (!config || isDevelopmentMode(config)) {
        throw new Error('AWS Cognito not configured. Please update public/amplify_outputs.json with your AWS credentials.');
      }
      
      await signUp({
        username: credentials.email,
        password: credentials.password,
        options: {
          userAttributes: {
            email: credentials.email,
            given_name: credentials.name || '',
          },
        },
      });
      
      // Note: User will need to verify email before they can sign in
      // This is handled by Cognito's email verification flow
      
    } catch (error: any) {
      const errorMessage = error.message || 'Signup failed';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      setError(null);
      
      if (config && !isDevelopmentMode(config)) {
        await signOut();
      }
      
      setUser(null);
    } catch (error: any) {
      const errorMessage = error.message || 'Logout failed';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  const updateProfile = async (data: { name?: string }) => {
    try {
      setError(null);
      
      if (!config || isDevelopmentMode(config)) {
        throw new Error('AWS Cognito not configured. Please update public/amplify_outputs.json with your AWS credentials.');
      }
      
      await updateUserAttributes({
        userAttributes: {
          given_name: data.name || '',
        }
      });
      
      // Fetch updated user attributes to get the latest data
      const userAttributes = await fetchUserAttributes();
      
      // Update local user state
      if (user) {
        setUser({
          ...user,
          name: userAttributes.given_name || userAttributes.name || user.email,
        });
      }
    } catch (error: any) {
      const errorMessage = error.message || 'Profile update failed';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  const changePassword = async (oldPassword: string, newPassword: string) => {
    try {
      setError(null);
      
      if (!config || isDevelopmentMode(config)) {
        throw new Error('AWS Cognito not configured. Please update public/amplify_outputs.json with your AWS credentials.');
      }
      
      await updatePassword({
        oldPassword,
        newPassword,
      });
    } catch (error: any) {
      const errorMessage = error.message || 'Password change failed';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  const requestPasswordReset = async (email: string) => {
    try {
      setError(null);
      
      if (!config || isDevelopmentMode(config)) {
        throw new Error('AWS Cognito not configured. Please update public/amplify_outputs.json with your AWS credentials.');
      }
      
      await resetPassword({
        username: email,
      });
    } catch (error: any) {
      const errorMessage = error.message || 'Password reset request failed';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  const confirmPasswordReset = async (email: string, confirmationCode: string, newPassword: string) => {
    try {
      setError(null);
      
      if (!config || isDevelopmentMode(config)) {
        throw new Error('AWS Cognito not configured. Please update public/amplify_outputs.json with your AWS credentials.');
      }
      
      await confirmResetPassword({
        username: email,
        confirmationCode,
        newPassword,
      });
    } catch (error: any) {
      const errorMessage = error.message || 'Password reset confirmation failed';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  const deleteProfile = async () => {
    try {
      setError(null);
      
      if (!config || isDevelopmentMode(config)) {
        throw new Error('AWS Cognito not configured. Please update public/amplify_outputs.json with your AWS credentials.');
      }
      
      // Delete user from Cognito
      await deleteUser();
      
      // Clear local state
      setUser(null);
    } catch (error: any) {
      const errorMessage = error.message || 'Profile deletion failed';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    signup,
    logout,
    updateProfile,
    changePassword,
    requestPasswordReset,
    confirmPasswordReset,
    deleteProfile,
    error
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// Custom hook to use auth context
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}