import { Routes, Route } from 'react-router-dom';
import { AuthDemo, ConfigurationStatus, LoginForm, SignupForm } from './components';
import { PublicPage, ActiveTimerPage, ForgotPasswordPage, PasswordResetPage, ProfilePage, StatsDashboard, TimeRecordViews, LoginPage } from './pages';
import { AppProviders, DataProviders } from './providers';
import { AuthLayout, DashboardLayout } from './layouts';
import { StatusBars } from './status';
import { AuthenticatedRoute, ProtectedRoute } from './routes';

function App() {
  return (
    <AppProviders>
      <StatusBars />
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<PublicPage />} />
            <Route path="/login" element={
              <LoginPage />
            } />
            <Route path="/signup" element={
              <AuthenticatedRoute>
                <AuthLayout>
                  <ConfigurationStatus />
                  <SignupForm 
                    onSuccess={() => window.location.href = '/login'} 
                    onSwitchToLogin={() => window.location.href = '/login'}
                  />
                </AuthLayout>
              </AuthenticatedRoute>
            } />
            
            {/* Password reset routes */}
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<PasswordResetPage />} />
            
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
            
            {/* Protected routes with DataCacheProvider */}
            <Route path="/active-timer" element={
              <ActiveTimerPage />
            } />
            
            {/* Time record views with different URL paths */}
            <Route path="/records" element={
              <ProtectedRoute>
                <DataProviders>
                  <DashboardLayout>
                    <TimeRecordViews />
                  </DashboardLayout>
                </DataProviders>
              </ProtectedRoute>
            } />
            
            <Route path="/records/daily" element={
              <ProtectedRoute>
                <DataProviders>
                  <DashboardLayout>
                    <TimeRecordViews />
                  </DashboardLayout>
                </DataProviders>
              </ProtectedRoute>
            } />
            
            <Route path="/records/weekly" element={
              <ProtectedRoute>
                <DataProviders>
                  <DashboardLayout>
                    <TimeRecordViews />
                  </DashboardLayout>
                </DataProviders>
              </ProtectedRoute>
            } />
            
            <Route path="/records/monthly" element={
              <ProtectedRoute>
                <DataProviders>
                  <DashboardLayout>
                    <TimeRecordViews />
                  </DashboardLayout>
                </DataProviders>
              </ProtectedRoute>
            } />
            
            {/* Statistics/Analytics route */}
            <Route path="/analytics" element={
              <ProtectedRoute>
                <DataProviders>
                  <DashboardLayout>
                    <StatsDashboard />
                  </DashboardLayout>
                </DataProviders>
              </ProtectedRoute>
            } />
            
            {/* Profile route */}
            <Route path="/profile" element={
              <ProtectedRoute>
                <DataProviders>
                  <DashboardLayout>
                    <ProfilePage />
                  </DashboardLayout>
                </DataProviders>
              </ProtectedRoute>
            } />
          </Routes>
    </AppProviders>
  )
}

export default App