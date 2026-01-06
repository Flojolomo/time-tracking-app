import { AuthDemo } from './components/AuthDemo';
import { ProtectedRoute } from './components/ProtectedRoute';

function App() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8 text-center">
          Time Tracking App
        </h1>
        
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
  )
}

export default App