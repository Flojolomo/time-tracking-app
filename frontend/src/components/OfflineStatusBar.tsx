import React from 'react';
import { useOffline } from '../hooks/useOffline';
import { LoadingSpinner } from './LoadingSpinner';

export const OfflineStatusBar: React.FC = () => {
  const { offlineStatus, syncNow, clearOfflineData } = useOffline();

  // Don't show if online with no pending actions
  if (offlineStatus.isOnline && offlineStatus.pendingActions === 0 && !offlineStatus.hasUnsavedChanges) {
    return null;
  }

  const formatLastSync = (lastSync: string | null) => {
    if (!lastSync) return 'Never';
    
    const date = new Date(lastSync);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    
    return date.toLocaleDateString();
  };

  return (
    <div className="bg-blue-50 border-b border-blue-200 px-4 py-2">
      <div className="flex items-center justify-between max-w-7xl mx-auto">
        <div className="flex items-center space-x-3">
          {/* Status Icon */}
          <div className="flex-shrink-0">
            {offlineStatus.isSyncing ? (
              <LoadingSpinner size="sm" color="primary" />
            ) : offlineStatus.isOnline ? (
              <svg className="h-5 w-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            ) : (
              <svg className="h-5 w-5 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            )}
          </div>

          {/* Status Text */}
          <div className="text-sm">
            {offlineStatus.isSyncing ? (
              <span className="text-blue-700 font-medium">Syncing data...</span>
            ) : offlineStatus.isOnline ? (
              <div className="text-blue-700">
                <span className="font-medium">Online</span>
                {offlineStatus.pendingActions > 0 && (
                  <span className="ml-2">
                    • {offlineStatus.pendingActions} pending change{offlineStatus.pendingActions !== 1 ? 's' : ''}
                  </span>
                )}
                {offlineStatus.hasUnsavedChanges && (
                  <span className="ml-2">• Unsaved changes</span>
                )}
              </div>
            ) : (
              <div className="text-orange-700">
                <span className="font-medium">Working offline</span>
                {offlineStatus.pendingActions > 0 && (
                  <span className="ml-2">
                    • {offlineStatus.pendingActions} change{offlineStatus.pendingActions !== 1 ? 's' : ''} pending
                  </span>
                )}
              </div>
            )}
            
            {offlineStatus.lastSync && (
              <div className="text-xs text-blue-600 mt-1">
                Last sync: {formatLastSync(offlineStatus.lastSync)}
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center space-x-2">
          {offlineStatus.isOnline && offlineStatus.pendingActions > 0 && !offlineStatus.isSyncing && (
            <button
              onClick={syncNow}
              className="text-xs bg-blue-600 text-white px-3 py-1 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
            >
              Sync Now
            </button>
          )}
          
          {(offlineStatus.pendingActions > 0 || offlineStatus.hasUnsavedChanges) && (
            <button
              onClick={clearOfflineData}
              className="text-xs text-blue-600 hover:text-blue-800 focus:outline-none focus:underline transition-colors"
            >
              Clear
            </button>
          )}
        </div>
      </div>
    </div>
  );
};