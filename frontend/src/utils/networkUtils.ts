/**
 * Network utilities for handling API requests with retry logic and error handling
 */

export interface RetryOptions {
  maxRetries?: number;
  baseDelay?: number;
  maxDelay?: number;
  backoffFactor?: number;
  retryCondition?: (error: any) => boolean;
}

export interface NetworkError extends Error {
  status?: number;
  statusText?: string;
  isNetworkError?: boolean;
  isRetryable?: boolean;
}

/**
 * Default retry configuration
 */
const DEFAULT_RETRY_OPTIONS: Required<RetryOptions> = {
  maxRetries: 3,
  baseDelay: 1000, // 1 second
  maxDelay: 10000, // 10 seconds
  backoffFactor: 2,
  retryCondition: (error: any) => {
    // Retry on network errors or 5xx server errors
    return (
      error.isNetworkError ||
      (error.status >= 500 && error.status < 600) ||
      error.status === 429 // Rate limiting
    );
  }
};

/**
 * Sleep utility for delays
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Calculate exponential backoff delay
 */
function calculateDelay(attempt: number, options: Required<RetryOptions>): number {
  const delay = options.baseDelay * Math.pow(options.backoffFactor, attempt - 1);
  return Math.min(delay, options.maxDelay);
}

/**
 * Enhanced fetch with retry logic and better error handling
 */
export async function fetchWithRetry(
  url: string,
  init?: RequestInit,
  retryOptions?: RetryOptions
): Promise<Response> {
  const options = { ...DEFAULT_RETRY_OPTIONS, ...retryOptions };
  let lastError: NetworkError;

  for (let attempt = 1; attempt <= options.maxRetries + 1; attempt++) {
    try {
      // Add timeout to prevent hanging requests
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

      const response = await fetch(url, {
        ...init,
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      // If response is ok, return it
      if (response.ok) {
        return response;
      }

      // Create error for non-ok responses
      const error: NetworkError = new Error(`HTTP ${response.status}: ${response.statusText}`);
      error.status = response.status;
      error.statusText = response.statusText;
      error.isNetworkError = false;
      error.isRetryable = options.retryCondition(error);

      // If it's the last attempt or not retryable, throw the error
      if (attempt > options.maxRetries || !error.isRetryable) {
        throw error;
      }

      lastError = error;

    } catch (error: any) {
      // Handle network errors (fetch failures)
      if (error.name === 'AbortError') {
        const timeoutError: NetworkError = new Error('Request timeout');
        timeoutError.isNetworkError = true;
        timeoutError.isRetryable = true;
        lastError = timeoutError;
      } else if (error.name === 'TypeError' || !navigator.onLine) {
        // Network error or offline
        const networkError: NetworkError = new Error('Network error - please check your connection');
        networkError.isNetworkError = true;
        networkError.isRetryable = true;
        lastError = networkError;
      } else {
        // Re-throw non-network errors immediately
        throw error;
      }

      // If it's the last attempt, throw the error
      if (attempt > options.maxRetries) {
        throw lastError;
      }
    }

    // Wait before retrying (except on the last attempt)
    if (attempt <= options.maxRetries) {
      const delay = calculateDelay(attempt, options);
      console.log(`Request failed, retrying in ${delay}ms (attempt ${attempt}/${options.maxRetries})`);
      await sleep(delay);
    }
  }

  // This should never be reached, but just in case
  throw lastError!;
}

/**
 * Check if the user is online
 */
export function isOnline(): boolean {
  return navigator.onLine;
}

/**
 * Listen for online/offline events
 */
export function addNetworkListener(
  onOnline: () => void,
  onOffline: () => void
): () => void {
  const handleOnline = () => onOnline();
  const handleOffline = () => onOffline();

  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);

  return () => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
  };
}

/**
 * Create a network-aware fetch function
 */
export function createNetworkAwareFetch(
  onNetworkError?: (error: NetworkError) => void,
  onRetry?: (attempt: number, maxRetries: number) => void
) {
  return async (url: string, init?: RequestInit, retryOptions?: RetryOptions): Promise<Response> => {
    try {
      return await fetchWithRetry(url, init, {
        ...retryOptions,
        retryCondition: (error: any) => {
          const shouldRetry = DEFAULT_RETRY_OPTIONS.retryCondition(error);
          
          if (shouldRetry && onRetry) {
            // This is a bit of a hack since we don't have attempt number here
            // In a real implementation, you might want to refactor this
            onRetry(1, retryOptions?.maxRetries || DEFAULT_RETRY_OPTIONS.maxRetries);
          }
          
          return shouldRetry;
        }
      });
    } catch (error: any) {
      if (onNetworkError && (error.isNetworkError || error.isRetryable)) {
        onNetworkError(error);
      }
      throw error;
    }
  };
}

/**
 * Utility to handle common API response patterns
 */
export async function handleApiResponse<T>(response: Response): Promise<T> {
  const contentType = response.headers.get('content-type');
  
  if (!response.ok) {
    let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
    
    try {
      if (contentType?.includes('application/json')) {
        const errorData = await response.json();
        errorMessage = errorData.message || errorData.error || errorMessage;
      } else {
        const errorText = await response.text();
        if (errorText) {
          errorMessage = errorText;
        }
      }
    } catch {
      // If we can't parse the error response, use the default message
    }
    
    const error: NetworkError = new Error(errorMessage);
    error.status = response.status;
    error.statusText = response.statusText;
    throw error;
  }
  
  if (contentType?.includes('application/json')) {
    return await response.json();
  }
  
  // For non-JSON responses, return the text
  return (await response.text()) as unknown as T;
}