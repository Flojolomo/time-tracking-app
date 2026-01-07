import { Routes, Route, Navigate } from 'react-router-dom';
import { LandingPage, AuthDemo, ProtectedRoute, ConfigurationStatus, LoginForm, SignupForm, TimeRecordViews, StatsDashboard, TimerWidget, ActiveRecordDisplay } from './components';
import { useAuth } from './hooks/useAuth';
import { ViewStateProvider } from './contexts/ViewStateContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import { NotificationContainer } from './components/NotificationContainer';
import { NetworkStatusBanner } from './components/NetworkStatusBanner';
import { OfflineStatusBar } from './components/OfflineStatusBar';
import { registerServiceWorker } from './utils/serviceWorker';
import React, { useEffect } from 'react';

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
  // Register service worker on app start
  useEffect(() => {
    registerServiceWorker().then(status => {
      if (status.isRegistered) {
        console.log('Service Worker registered successfully');
      } else {
        console.log('Service Worker registration failed or not supported');
      }
    });
  }, []);

  return (
    <ErrorBoundary>
      <NotificationProvider>
        <ViewStateProvider>
          <NetworkStatusBanner />
          <OfflineStatusBar />
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
            
            {/* Statistics/Analytics route */}
            <Route path="/analytics" element={
              <ProtectedRoute>
                <DashboardLayout>
                  <StatsDashboard />
                </DashboardLayout>
              </ProtectedRoute>
            } />
          </Routes>
          <NotificationContainer />
        </ViewStateProvider>
      </NotificationProvider>
    </ErrorBoundary>
  )
}

// Dashboard layout component for consistent navigation
function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
  
  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-gray-900">TimeTracker</h1>
              
              {/* Desktop Navigation */}
              <nav className="hidden md:flex md:ml-8 md:space-x-4">
                <a
                  href="/dashboard"
                  className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  Dashboard
                </a>
                <a
                  href="/records"
                  className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  Time Records
                </a>
                <a
                  href="/analytics"
                  className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  Analytics
                </a>
              </nav>
            </div>
            
            {/* Desktop User Menu */}
            <div className="hidden md:flex md:items-center md:space-x-4">
              <span className="text-sm text-gray-600 truncate max-w-48">Welcome, {user?.email}</span>
              <button
                onClick={logout}
                className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
              >
                Sign out
              </button>
            </div>
            
            {/* Mobile menu button */}
            <div className="md:hidden flex items-center">
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500"
                aria-expanded="false"
              >
                <span className="sr-only">Open main menu</span>
                {!isMobileMenuOpen ? (
                  <svg className="block h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                ) : (
                  <svg className="block h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden">
            <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 bg-white border-t border-gray-200">
              <a
                href="/dashboard"
                className="text-gray-600 hover:text-gray-900 block px-3 py-2 rounded-md text-base font-medium transition-colors"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Dashboard
              </a>
              <a
                href="/records"
                className="text-gray-600 hover:text-gray-900 block px-3 py-2 rounded-md text-base font-medium transition-colors"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Time Records
              </a>
              <a
                href="/analytics"
                className="text-gray-600 hover:text-gray-900 block px-3 py-2 rounded-md text-base font-medium transition-colors"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Analytics
              </a>
              <div className="border-t border-gray-200 pt-4 pb-3">
                <div className="px-3 py-2">
                  <div className="text-sm text-gray-600 mb-2">Welcome, {user?.email}</div>
                  <button
                    onClick={() => {
                      logout();
                      setIsMobileMenuOpen(false);
                    }}
                    className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
                  >
                    Sign out
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </nav>
      
      <div className="max-w-7xl mx-auto py-4 sm:py-6 px-4 sm:px-6 lg:px-8">
        <div className="sm:px-0">
          {children}
        </div>
      </div>
    </div>
  );
}

// Dashboard component for authenticated users
function Dashboard() {
  const [refreshTrigger, setRefreshTrigger] = React.useState(0);

  const handleTimerUpdate = () => {
    // Trigger refresh of active record display and any other data
    setRefreshTrigger(prev => prev + 1);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Active Record Display */}
        <ActiveRecordDisplay refreshTrigger={refreshTrigger} />
        
        {/* Timer Widget */}
        <TimerWidget onTimerUpdate={handleTimerUpdate} />
        

      </div>
    </DashboardLayout>
  );
}

export default App