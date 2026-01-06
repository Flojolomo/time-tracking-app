import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { Auth } from 'aws-amplify';
import { AuthUser, LoginCredentials, SignupCredentials, AuthContextType } from '../types';
import { isDevelopmentMode } from '../aws-config';

// Create Auth Context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Auth Provider Component
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check if user is already authenticated on app load
  useEffect(() => {
    checkAuthState();
  }, []);

  const checkAuthState = async () => {
    try {
      setIsLoading(true);
      
      // If in development mode without AWS config, skip auth check
      if (isDevelopmentMode()) {
        setUser(null);
        setError('AWS Cognito not configured. Please set up your .env file with AWS credentials.');
        return;
      }

      const currentUser = await Auth.currentAuthenticatedUser();
      const session = await Auth.currentSession();
      
      setUser({
        userId: currentUser.attributes.sub,
        email: currentUser.attributes.email,
        name: currentUser.attributes.name,
        accessToken: session.getAccessToken().getJwtToken()
      });
    } catch (error) {
      // User is not authenticated or AWS not configured
      setUser(null);
      if (isDevelopmentMode()) {
        setError('AWS Cognito not configured. Please create a .env file with your AWS Cognito settings.');
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
      if (isDevelopmentMode()) {
        throw new Error('AWS Cognito not configured. Please set up your .env file with AWS credentials.');
      }
      
      const cognitoUser = await Auth.signIn(credentials.email, credentials.password);
      
      if (cognitoUser.challengeName === 'NEW_PASSWORD_REQUIRED') {
        throw new Error('New password required. Please contact support.');
      }
      
      const session = await Auth.currentSession();
      const currentUser = await Auth.currentAuthenticatedUser();
      
      setUser({
        userId: currentUser.attributes.sub,
        email: currentUser.attributes.email,
        name: currentUser.attributes.name,
        accessToken: session.getAccessToken().getJwtToken()
      });
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
      if (isDevelopmentMode()) {
        throw new Error('AWS Cognito not configured. Please set up your .env file with AWS credentials.');
      }
      
      await Auth.signUp({
        username: credentials.email,
        password: credentials.password,
        attributes: {
          email: credentials.email,
          name: credentials.name || ''
        }
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
      
      if (!isDevelopmentMode()) {
        await Auth.signOut();
      }
      
      setUser(null);
    } catch (error: any) {
      const errorMessage = error.message || 'Logout failed';
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