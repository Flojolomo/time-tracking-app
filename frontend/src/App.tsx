import { Routes, Route, Navigate } from 'react-router-dom';
import { LandingPage, AuthDemo, ProtectedRoute, ConfigurationStatus, LoginForm, SignupForm, TimeRecordViews } from './components';
import { useAuth } from './hooks/useAuth';
import { ViewStateProvider } from './contexts/ViewStateContext';

// Component to handle authenticated user redirects
function AuthenticatedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }
  
  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }
  
  return <>{children}</>;
}

function App() {
  return (
    <ViewStateProvider>
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={
          <AuthenticatedRoute>
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
              <div className="max-w-md w-full">
                <ConfigurationStatus />
                <LoginForm onSuccess={() => window.location.href = '/dashboard'} />
              </div>
            </div>
          </AuthenticatedRoute>
        } />
        <Route path="/signup" element={
          <AuthenticatedRoute>
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
              <div className="max-w-md w-full">
                <ConfigurationStatus />
                <SignupForm onSuccess={() => window.location.href = '/login'} />
              </div>
            </div>
          </AuthenticatedRoute>
        } />
        
        {/* Development/Demo route */}
        <Route path="/demo" element={
          <div className="min-h-screen bg-gray-50">
            <div className="container mx-auto px-4 py-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-8 text-center">
                Time Tracking App - Development Demo
              </h1>
              
              {/* Configuration status for development */}
              <ConfigurationStatus />
              
              {/* Demo of authentication components */}
              <div className="mb-8">
                <AuthDemo />
              </div>

              {/* Example of protected content */}
              <ProtectedRoute>
                <div className="max-w-md mx-auto bg-white rounded-lg shadow-md p-6">
                  <h2 className="text-xl font-semibold text-gray-900 mb-4">
                    Protected Content
                  </h2>
                  <p className="text-gray-600">
                    This content is only visible to authenticated users.
                  </p>
                </div>
              </ProtectedRoute>
            </div>
          </div>
        } />
        
        {/* Protected routes */}
        <Route path="/dashboard" element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        } />
        
        {/* Time record views with different URL paths */}
        <Route path="/records" element={
          <ProtectedRoute>
            <DashboardLayout>
              <TimeRecordViews />
            </DashboardLayout>
          </ProtectedRoute>
        } />
        
        <Route path="/records/daily" element={
          <ProtectedRoute>
            <DashboardLayout>
              <TimeRecordViews />
            </DashboardLayout>
          </ProtectedRoute>
        } />
        
        <Route path="/records/weekly" element={
          <ProtectedRoute>
            <DashboardLayout>
              <TimeRecordViews />
            </DashboardLayout>
          </ProtectedRoute>
        } />
        
        <Route path="/records/monthly" element={
          <ProtectedRoute>
            <DashboardLayout>
              <TimeRecordViews />
            </DashboardLayout>
          </ProtectedRoute>
        } />
      </Routes>
    </ViewStateProvider>
  )
}

// Dashboard layout component for consistent navigation
function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  
  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center space-x-8">
              <h1 className="text-xl font-semibold text-gray-900">TimeTracker</h1>
              <nav className="flex space-x-4">
                <a
                  href="/dashboard"
                  className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
                >
                  Dashboard
                </a>
                <a
                  href="/records"
                  className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
                >
                  Time Records
                </a>
              </nav>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">Welcome, {user?.email}</span>
              <button
                onClick={logout}
                className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      </nav>
      
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {children}
        </div>
      </div>
    </div>
  );
}

// Dashboard component for authenticated users
function Dashboard() {
  return (
    <DashboardLayout>
      <div className="text-center">
        <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100">
          <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="mt-2 text-2xl font-bold text-gray-900">Welcome to TimeTracker!</h2>
        <p className="mt-1 text-gray-600">
          You are successfully logged in. Navigate to Time Records to start tracking your time.
        </p>
        <div className="mt-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Available Features</h3>
            <ul className="text-left space-y-2 text-gray-600">
              <li>• Time record creation and management</li>
              <li>• Project organization and auto-suggestions</li>
              <li>• Multiple view formats (daily, weekly, monthly)</li>
              <li>• Statistics and analytics dashboard (coming soon)</li>
              <li>• Data visualization with charts (coming soon)</li>
            </ul>
            <div className="mt-4">
              <a
                href="/records"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                View Time Records
              </a>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

export default App