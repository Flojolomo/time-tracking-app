import { Routes, Route } from 'react-router-dom';
import { PublicPage, ActiveTimerPage, ForgotPasswordPage, ProfilePage, AnalyticsPage, RecordsPage, SignupPage, LoginPage } from './pages';
import { AppProviders, DataProviders } from './providers';
import { DashboardLayout } from './layouts';
import { StatusBars } from './status';
import { ProtectedRoute } from './routes';

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
            <Route path="/signup" element={<SignupPage />} />
            
            {/* Password reset route */}
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            
            {/* Protected routes with DataCacheProvider */}
            <Route path="/active-timer" element={
                  <ActiveTimerPage />
            } />
            
            {/* Records route */}
            <Route path="/records" element={<RecordsPage />} />
            
            {/* Analytics route */}
            <Route path="/analytics" element={<AnalyticsPage />} />
            
            {/* Profile route */}
            <Route path="/profile" element={<ProfilePage /> } />
          </Routes>
    </AppProviders>
  )
}

export default App