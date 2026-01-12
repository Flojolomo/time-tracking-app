import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '../../hooks/useAuth';
import { ForgotPasswordPage } from '../ForgotPasswordPage';

// Mock AWS Amplify
jest.mock('aws-amplify/auth', () => ({
  confirmResetPassword: jest.fn(),
}));

jest.mock('../../aws-config', () => ({
  getAmplifyConfig: jest.fn().mockResolvedValue({
    Auth: {
      Cognito: {
        userPoolId: 'test-pool-id',
        userPoolClientId: 'test-client-id',
      }
    }
  }),
  isDevelopmentMode: jest.fn().mockReturnValue(false),
}));

const renderPasswordResetPage = (searchParams = '?token=test-token&email=test@example.com') => {
  // Mock window.location.search
  Object.defineProperty(window, 'location', {
    value: {
      search: searchParams,
    },
    writable: true,
  });

  return render(
    <BrowserRouter>
      <AuthProvider>
        <ForgotPasswordPage />
      </AuthProvider>
    </BrowserRouter>
  );
};

describe('PasswordResetPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders password reset form with valid token and email', () => {
    renderPasswordResetPage();
    
    expect(screen.getByText('Reset Your Password')).toBeInTheDocument();
    expect(screen.getByLabelText('New Password')).toBeInTheDocument();
    expect(screen.getByLabelText('Confirm New Password')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reset Password' })).toBeInTheDocument();
  });

  it('shows error message when token or email is missing', () => {
    renderPasswordResetPage('?token=test-token'); // Missing email
    
    expect(screen.getByText('Invalid Reset Link')).toBeInTheDocument();
    expect(screen.getByText('This password reset link is invalid or has expired. Please request a new password reset.')).toBeInTheDocument();
  });

  it('validates password requirements', async () => {
    renderPasswordResetPage();
    
    const newPasswordInput = screen.getByLabelText('New Password');
    const confirmPasswordInput = screen.getByLabelText('Confirm New Password');
    const submitButton = screen.getByRole('button', { name: 'Reset Password' });

    // Test short password
    fireEvent.change(newPasswordInput, { target: { value: '123' } });
    fireEvent.change(confirmPasswordInput, { target: { value: '123' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Password must be at least 8 characters')).toBeInTheDocument();
    });
  });

  it('validates password confirmation match', async () => {
    renderPasswordResetPage();
    
    const newPasswordInput = screen.getByLabelText('New Password');
    const confirmPasswordInput = screen.getByLabelText('Confirm New Password');
    const submitButton = screen.getByRole('button', { name: 'Reset Password' });

    fireEvent.change(newPasswordInput, { target: { value: 'Password123!' } });
    fireEvent.change(confirmPasswordInput, { target: { value: 'DifferentPassword123!' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Passwords do not match')).toBeInTheDocument();
    });
  });

  it('has back to login link', () => {
    renderPasswordResetPage();
    
    const backToLoginLink = screen.getByText('Back to Login');
    expect(backToLoginLink).toBeInTheDocument();
    expect(backToLoginLink.closest('a')).toHaveAttribute('href', '/login');
  });
});