import { isDevelopmentMode } from '../aws-config';

export function ConfigurationStatus() {
  if (!isDevelopmentMode()) {
    return null; // Don't show if properly configured
  }

  return (
    <div className="max-w-2xl mx-auto mb-8 bg-yellow-50 border border-yellow-200 rounded-lg p-6">
      <div className="flex items-start">
        <div className="flex-shrink-0">
          <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        </div>
        <div className="ml-3">
          <h3 className="text-sm font-medium text-yellow-800">
            AWS Configuration Required
          </h3>
          <div className="mt-2 text-sm text-yellow-700">
            <p className="mb-3">
              To enable authentication features, you need to configure AWS Cognito:
            </p>
            
            <div className="space-y-4">
              <div>
                <h4 className="font-medium text-yellow-800 mb-2">For Development:</h4>
                <ol className="list-decimal list-inside space-y-1 ml-2">
                  <li>Run <code className="bg-yellow-100 px-1 rounded">npm run setup-env</code></li>
                  <li>Edit the created <code className="bg-yellow-100 px-1 rounded">.env</code> file</li>
                  <li>Add your AWS Cognito User Pool details</li>
                  <li>Restart the development server</li>
                </ol>
              </div>
              
              <div>
                <h4 className="font-medium text-yellow-800 mb-2">For Production (S3 Static Hosting):</h4>
                <ol className="list-decimal list-inside space-y-1 ml-2">
                  <li>Deploy AWS infrastructure (CDK will handle configuration)</li>
                  <li>Build process injects config into <code className="bg-yellow-100 px-1 rounded">config.js</code></li>
                  <li>No environment variables needed in production</li>
                </ol>
              </div>
            </div>
            
            <div className="mt-4 p-3 bg-yellow-100 rounded text-xs">
              <strong>Required AWS values:</strong>
              <ul className="mt-1 space-y-1">
                <li>• Cognito User Pool ID</li>
                <li>• Cognito User Pool Client ID</li>
                <li>• AWS Region</li>
                <li>• API Gateway Endpoint (optional)</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}