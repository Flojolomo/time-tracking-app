import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { Auth } from 'aws-amplify';
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
      
      setUser({
        userId: currentUser.userId,
        email: currentUser.signInDetails?.loginId || '',
        name: currentUser.signInDetails?.loginId || '',
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
        
        setUser({
          userId: currentUser.userId,
          email: currentUser.signInDetails?.loginId || '',
          name: currentUser.signInDetails?.loginId || '',
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