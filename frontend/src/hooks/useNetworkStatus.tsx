import { useState, useEffect } from 'react';
import { addNetworkListener, isOnline } from '../utils/networkUtils';

export interface NetworkStatus {
  isOnline: boolean;
  isReconnecting: boolean;
  lastOfflineTime?: Date;
  lastOnlineTime?: Date;
}

export function useNetworkStatus() {
  const [networkStatus, setNetworkStatus] = useState<NetworkStatus>({
    isOnline: isOnline(),
    isReconnecting: false
  });

  useEffect(() => {
    let reconnectTimeout: NodeJS.Timeout;

    const handleOnline = () => {
      // Clear any reconnection timeout
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }

      // Set reconnecting state briefly to show user we're back online
      setNetworkStatus(prev => ({
        ...prev,
        isOnline: true,
        isReconnecting: true,
        lastOnlineTime: new Date()
      }));

      // Clear reconnecting state after a short delay
      reconnectTimeout = setTimeout(() => {
        setNetworkStatus(prev => ({
          ...prev,
          isReconnecting: false
        }));
      }, 2000);
    };

    const handleOffline = () => {
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }

      setNetworkStatus(prev => ({
        ...prev,
        isOnline: false,
        isReconnecting: false,
        lastOfflineTime: new Date()
      }));
    };

    // Set up network listeners
    const removeListeners = addNetworkListener(handleOnline, handleOffline);

    // Cleanup
    return () => {
      removeListeners();
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }
    };
  }, []);

  return networkStatus;
}

// Hook for handling network-aware operations
export function useNetworkAwareOperation() {
  const networkStatus = useNetworkStatus();
  const [retryCount, setRetryCount] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);

  const executeWithRetry = async <T,>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    onRetry?: (attempt: number) => void
  ): Promise<T> => {
    if (!networkStatus.isOnline) {
      throw new Error('No internet connection. Please check your network and try again.');
    }

    let lastError: Error;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        setIsRetrying(attempt > 1);
        setRetryCount(attempt - 1);
        
        const result = await operation();
        
        // Success - reset retry state
        setIsRetrying(false);
        setRetryCount(0);
        
        return result;
      } catch (error: any) {
        lastError = error;
        
        if (onRetry) {
          onRetry(attempt);
        }
        
        // If it's the last attempt or a non-retryable error, throw
        if (attempt >= maxRetries || !error.isRetryable) {
          setIsRetrying(false);
          setRetryCount(0);
          throw error;
        }
        
        // Wait before retrying (exponential backoff)
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    setIsRetrying(false);
    setRetryCount(0);
    throw lastError!;
  };

  return {
    networkStatus,
    retryCount,
    isRetrying,
    executeWithRetry
  };
}