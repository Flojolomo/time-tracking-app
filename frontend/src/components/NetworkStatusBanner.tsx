import React from 'react';
import { useNetworkStatus } from '../hooks/useNetworkStatus';

export const NetworkStatusBanner: React.FC = () => {
  const { isOnline, isReconnecting, lastOfflineTime } = useNetworkStatus();

  // Don't show anything if we're online and not reconnecting
  if (isOnline && !isReconnecting) {
    return null;
  }

  // Show reconnecting message
  if (isReconnecting) {
    return (
      <div className="bg-green-600 text-white px-4 py-2 text-center text-sm font-medium">
        <div className="flex items-center justify-center space-x-2">
          <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span>Connection restored</span>
        </div>
      </div>
    );
  }

  // Show offline message
  return (
    <div className="bg-red-600 text-white px-4 py-2 text-center text-sm font-medium">
      <div className="flex items-center justify-center space-x-2">
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-12.728 12.728m0-12.728l12.728 12.728" />
        </svg>
        <span>
          No internet connection
          {lastOfflineTime && (
            <span className="ml-1 opacity-75">
              (since {lastOfflineTime.toLocaleTimeString()})
            </span>
          )}
        </span>
      </div>
    </div>
  );
};