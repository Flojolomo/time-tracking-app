import { render, screen } from '@testing-library/react';
import { ProfilePage } from '../ProfilePage';
import { AuthProvider } from '../../hooks/useAuth';
import { BrowserRouter } from 'react-router-dom';

// Mock AWS Amplify
jest.mock('aws-amplify/auth', () => ({
  getCurrentUser: jest.fn(),
  fetchAuthSession: jest.fn(),
  signIn: jest.fn(),
  signUp: jest.fn(),
  signOut: jest.fn(),
  updatePassword: jest.fn(),
  updateUserAttributes: jest.fn(),
  deleteUser: jest.fn(),
  resetPassword: jest.fn(),
}));

// Mock AWS config
jest.mock('../../aws-config', () => ({
  getAmplifyConfig: jest.fn().mockResolvedValue({
    Auth: {
      Cognito: {
        userPoolId: 'test-pool',
        userPoolClientId: 'test-client',
      }
    }
  }),
  isDevelopmentMode: jest.fn().mockReturnValue(false),
}));

const renderWithProviders = (component: React.ReactElement) => {
  return render(
    <BrowserRouter>
      <AuthProvider>
        {component}
      </AuthProvider>
    </BrowserRouter>
  );
};

describe('ProfilePage', () => {
  it('renders login message when user is not authenticated', () => {
    renderWithProviders(<ProfilePage />);
    
    expect(screen.getByText('Please log in to access your profile.')).toBeInTheDocument();
  });

  it('renders profile settings when user is authenticated', async () => {
    // Mock authenticated user
    const mockUser = {
      userId: 'test-user-id',
      email: 'test@example.com',
      name: 'Test User',
      accessToken: 'test-token'
    };

    // Mock the auth context to return authenticated user
    jest.doMock('../../hooks/useAuth', () => ({
      useAuth: () => ({
        user: mockUser,
        isLoading: false,
        isAuthenticated: true,
        login: jest.fn(),
        signup: jest.fn(),
        logout: jest.fn(),
        updateProfile: jest.fn(),
        changePassword: jest.fn(),
        requestPasswordReset: jest.fn(),
        deleteProfile: jest.fn(),
        error: null,
      }),
      AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    }));

    const { ProfilePage: AuthenticatedProfilePage } = await import('../ProfilePage');
    
    renderWithProviders(<AuthenticatedProfilePage />);
    
    expect(screen.getByText('Profile Settings')).toBeInTheDocument();
    expect(screen.getByText('Profile Information')).toBeInTheDocument();
    expect(screen.getByText('Password & Security')).toBeInTheDocument();
    expect(screen.getByText('Danger Zone')).toBeInTheDocument();
  });
});