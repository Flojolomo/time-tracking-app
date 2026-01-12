import { Routes, Route } from 'react-router-dom';
import { PublicPage, ActiveTimerPage, ForgotPasswordPage, ProfilePage, AnalyticsPage, RecordsPage, SignupPage, LoginPage } from './pages';
import { AppProviders } from './providers';
import { StatusBars } from './status';

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