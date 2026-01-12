import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '../../hooks/useAuth';
import { confirmResetPassword } from 'aws-amplify/auth';
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

const mockConfirmResetPassword = confirmResetPassword as jest.MockedFunction<typeof confirmResetPassword>;

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

describe('PasswordResetPage Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('successfully resets password with valid token and email', async () => {
    mockConfirmResetPassword.mockResolvedValueOnce(undefined);
    
    renderPasswordResetPage();
    
    const newPasswordInput = screen.getByLabelText('New Password');
    const confirmPasswordInput = screen.getByLabelText('Confirm New Password');
    const submitButton = screen.getByRole('button', { name: 'Reset Password' });

    // Fill in valid password
    fireEvent.change(newPasswordInput, { target: { value: 'NewPassword123!' } });
    fireEvent.change(confirmPasswordInput, { target: { value: 'NewPassword123!' } });
    
    // Submit form
    fireEvent.click(submitButton);

    // Wait for API call
    await waitFor(() => {
      expect(mockConfirmResetPassword).toHaveBeenCalledWith({
        username: 'test@example.com',
        confirmationCode: 'test-token',
        newPassword: 'NewPassword123!',
      });
    });

    // Should show success message
    await waitFor(() => {
      expect(screen.getByText('Password Reset Successful')).toBeInTheDocument();
    });
  });

  it('handles expired token error', async () => {
    const expiredError = new Error('Expired code');
    expiredError.name = 'ExpiredCodeException';
    mockConfirmResetPassword.mockRejectedValueOnce(expiredError);
    
    renderPasswordResetPage();
    
    const newPasswordInput = screen.getByLabelText('New Password');
    const confirmPasswordInput = screen.getByLabelText('Confirm New Password');
    const submitButton = screen.getByRole('button', { name: 'Reset Password' });

    fireEvent.change(newPasswordInput, { target: { value: 'NewPassword123!' } });
    fireEvent.change(confirmPasswordInput, { target: { value: 'NewPassword123!' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Reset code has expired. Please request a new password reset.')).toBeInTheDocument();
    });
  });

  it('handles invalid token error', async () => {
    const invalidError = new Error('Invalid code');
    invalidError.name = 'CodeMismatchException';
    mockConfirmResetPassword.mockRejectedValueOnce(invalidError);
    
    renderPasswordResetPage();
    
    const newPasswordInput = screen.getByLabelText('New Password');
    const confirmPasswordInput = screen.getByLabelText('Confirm New Password');
    const submitButton = screen.getByRole('button', { name: 'Reset Password' });

    fireEvent.change(newPasswordInput, { target: { value: 'NewPassword123!' } });
    fireEvent.change(confirmPasswordInput, { target: { value: 'NewPassword123!' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Invalid or expired reset code. Please request a new password reset.')).toBeInTheDocument();
    });
  });

  it('handles weak password error', async () => {
    const weakPasswordError = new Error('Password does not meet requirements');
    weakPasswordError.name = 'InvalidPasswordException';
    mockConfirmResetPassword.mockRejectedValueOnce(weakPasswordError);
    
    renderPasswordResetPage();
    
    const newPasswordInput = screen.getByLabelText('New Password');
    const confirmPasswordInput = screen.getByLabelText('Confirm New Password');
    const submitButton = screen.getByRole('button', { name: 'Reset Password' });

    fireEvent.change(newPasswordInput, { target: { value: 'WeakPassword123!' } });
    fireEvent.change(confirmPasswordInput, { target: { value: 'WeakPassword123!' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Password does not meet requirements. Please choose a stronger password.')).toBeInTheDocument();
    });
  });
});