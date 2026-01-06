import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { Auth } from 'aws-amplify';
import { AuthUser, LoginCredentials, SignupCredentials, AuthContextType } from '../types';

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
      const currentUser = await Auth.currentAuthenticatedUser();
      const session = await Auth.currentSession();
      
      setUser({
        userId: currentUser.attributes.sub,
        email: currentUser.attributes.email,
        name: currentUser.attributes.name,
        accessToken: session.getAccessToken().getJwtToken()
      });
    } catch (error) {
      // User is not authenticated
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (credentials: LoginCredentials) => {
    try {
      setError(null);
      setIsLoading(true);
      
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
      await Auth.signOut();
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