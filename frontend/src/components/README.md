# Authentication Components

This directory contains the authentication components and hooks for the Time Tracking App.

## Components

### LoginForm
A form component for user authentication with email and password.

**Props:**
- `onSuccess?: () => void` - Callback called after successful login
- `onSwitchToSignup?: () => void` - Callback to switch to signup form

**Features:**
- Form validation with react-hook-form
- Error handling and display
- Loading states
- Responsive design

### SignupForm
A form component for user registration with email, password, and optional name.

**Props:**
- `onSuccess?: () => void` - Callback called after successful signup
- `onSwitchToLogin?: () => void` - Callback to switch to login form

**Features:**
- Form validation including password confirmation
- Email verification flow
- Error handling and display
- Loading states
- Responsive design

### ProtectedRoute
A wrapper component that protects routes from unauthenticated access.

**Props:**
- `children: ReactNode` - The content to protect
- `redirectTo?: string` - Where to redirect unauthenticated users (default: '/login')

**Features:**
- Automatic redirection for unauthenticated users
- Loading state while checking authentication
- Preserves intended destination for post-login redirect

### AuthDemo
A demo component that showcases the authentication flow.

**Features:**
- Switches between login and signup forms
- Shows authenticated user information
- Provides logout functionality

## Hooks

### useAuth
A custom hook that provides authentication state and methods.

**Returns:**
- `user: AuthUser | null` - Current authenticated user
- `isLoading: boolean` - Loading state
- `isAuthenticated: boolean` - Authentication status
- `login: (credentials: LoginCredentials) => Promise<void>` - Login method
- `signup: (credentials: SignupCredentials) => Promise<void>` - Signup method
- `logout: () => Promise<void>` - Logout method
- `error: string | null` - Current error message

### AuthProvider
A context provider that wraps the application to provide authentication state.

**Usage:**
```tsx
import { AuthProvider } from './hooks/useAuth';

function App() {
  return (
    <AuthProvider>
      {/* Your app components */}
    </AuthProvider>
  );
}
```

## Configuration

The authentication system requires AWS Cognito configuration using AWS Amplify Gen 2 structure. Update `amplify_outputs.json` with your AWS resources:

```json
{
  "version": "1",
  "auth": {
    "aws_region": "us-east-1",
    "user_pool_id": "your-user-pool-id",
    "user_pool_client_id": "your-user-pool-client-id",
    "identity_pool_id": "your-identity-pool-id",
    "oauth": {
      "domain": "your-app.auth.us-east-1.amazoncognito.com",
      "redirect_sign_in_uri": ["http://localhost:3001/"],
      "redirect_sign_out_uri": ["http://localhost:3001/"]
    }
  }
}
```

## Troubleshooting

### ReferenceError: global is not defined

This error has been resolved with polyfills and Vite configuration updates. If you still encounter this issue:

1. Ensure `src/polyfills.ts` is imported in `main.tsx`
2. Check that `vite.config.ts` includes the global polyfill
3. Verify the script tag in `index.html` is present

For more troubleshooting information, see `TROUBLESHOOTING.md`.

## Usage Example

```tsx
import { AuthProvider, useAuth } from './hooks/useAuth';
import { LoginForm, SignupForm, ProtectedRoute } from './components';

function App() {
  return (
    <AuthProvider>
      <div className="app">
        <ProtectedRoute>
          <Dashboard />
        </ProtectedRoute>
      </div>
    </AuthProvider>
  );
}

function LoginPage() {
  return (
    <LoginForm
      onSuccess={() => {
        // Handle successful login
        window.location.href = '/dashboard';
      }}
      onSwitchToSignup={() => {
        // Handle switch to signup
        setCurrentView('signup');
      }}
    />
  );
}
```

## Requirements Validation

This implementation satisfies the following requirements:

- **1.3**: Authentication system provides login and registration functionality
- **1.4**: Users are redirected to main application interface after successful authentication
- **1.5**: Authenticated users can access their personal time records and functionality

The components are fully responsive, include proper error handling, and integrate with AWS Cognito for secure authentication.