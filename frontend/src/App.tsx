import { Routes, Route } from 'react-router-dom';
import { LandingPage, AuthDemo, ProtectedRoute, ConfigurationStatus, LoginForm, SignupForm } from './components';

function App() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="max-w-md w-full">
            <ConfigurationStatus />
            <LoginForm />
          </div>
        </div>
      } />
      <Route path="/signup" element={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="max-w-md w-full">
            <ConfigurationStatus />
            <SignupForm />
          </div>
        </div>
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
      
      {/* Protected routes - placeholder for future implementation */}
      <Route path="/dashboard" element={
        <ProtectedRoute>
          <div className="min-h-screen bg-gray-50 flex items-center justify-center">
            <div className="text-center">
              <h1 className="text-2xl font-bold text-gray-900 mb-4">Dashboard</h1>
              <p className="text-gray-600">Time tracking dashboard will be implemented in future tasks.</p>
            </div>
          </div>
        </ProtectedRoute>
      } />
    </Routes>
  )
}

export default App