import { Routes, Route } from 'react-router-dom';
import { AuthDemo, ConfigurationStatus, SignupForm } from './components';
import { PublicPage, ActiveTimerPage, ForgotPasswordPage, PasswordResetPage, ProfilePage, AnalyticsPage, RecordsPage, LoginPage } from './pages';
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
            
            {/* Protected routes with DataCacheProvider */}
            <Route path="/active-timer" element={
                  <ActiveTimerPage />
            } />
            
            {/* Records route */}
            <Route path="/records" element={<RecordsPage />} />
            
            {/* Analytics route */}
            <Route path="/analytics" element={<AnalyticsPage />} />
            
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