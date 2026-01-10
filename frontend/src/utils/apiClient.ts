/**
 * API client configuration and utilities for time tracking operations
 * Uses Amplify REST API with IAM authentication
 */

import { get, post, put, del } from 'aws-amplify/api';
import { fetchAuthSession } from 'aws-amplify/auth';
import { TimeRecord } from '../types';

/**
 * Utility function to handle API errors
 */
export function handleApiError(error: unknown): string {
  if (error && typeof error === 'object' && 'response' in error) {
    const apiError = error as { response?: { body?: { message?: string } } };
    if (apiError.response?.body?.message) {
      return apiError.response.body.message;
    }
  }
  
  if (error instanceof Error) {
    return error.message;
  }
  
  return 'An unexpected error occurred';
}

/**
 * Ensure user has valid AWS credentials before making API calls
 */
async function ensureCredentials(): Promise<void> {
  try {
    const session = await fetchAuthSession();
    
    if (!session.credentials) {
      throw new Error('No AWS credentials available. Please ensure you are logged in.');
    }
    
    if (!session.identityId) {
      throw new Error('No identity ID available. Please check your Cognito Identity Pool configuration.');
    }
  } catch (error) {
    console.error('Credential check failed:', error);
    throw new Error('Authentication required. Please log in again.');
  }
}

/**
 * Enhanced API request function using Amplify REST API
 * Optimized to minimize CORS preflight requests
 */
export async function apiRequest<T>(
  path: string,
  options?: {
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
    body?: unknown;
    queryParams?: Record<string, string>;
  }
): Promise<T> {
  try {
    // Ensure user has valid credentials
    await ensureCredentials();
    
    const { method = 'GET', body: requestBody, queryParams } = options || {};
    
    // Remove leading slash and API base URL since Amplify handles this
    const cleanPath = path.replace(/^https?:\/\/[^/]+/, '').replace(/^\//, '');
    
    let response;
    
    // Optimize request options to avoid preflight when possible
    const requestOptions = {
      queryParams: queryParams || {},
      headers: {
        // Use only simple headers to avoid preflight
        'Content-Type': 'application/json',
      },
      ...(requestBody as Object && { body: requestBody }) as Object
    };
    
    switch (method) {
      case 'GET':
        response = get({
          apiName: 'Time Tracking API',
          path: cleanPath,
          options: {
            queryParams: queryParams || {},
            headers: {}, // Minimal headers for GET requests
          },
        });
        break;
      case 'POST':
        response = post({
          apiName: 'Time Tracking API',
          path: cleanPath,
          options: requestOptions,
        });
        break;
      case 'PUT':
        response = put({
          apiName: 'Time Tracking API',
          path: cleanPath,
          options: requestOptions,
        });
        break;
      case 'DELETE':
        response = del({
          apiName: 'Time Tracking API',
          path: cleanPath,
          options: {
            queryParams: queryParams || {},
            headers: {}, // Minimal headers for DELETE requests
          },
        });
        break;
      default:
        throw new Error(`Unsupported HTTP method: ${method}`);
    }
    
    const { body } = await response.response;
    const data = await body.json();
    return data as T;
  } catch (error: unknown) {
    console.error('API request failed:', error);
    
    // Handle specific AWS/Amplify errors
    if (error && typeof error === 'object' && 'name' in error) {
      const namedError = error as { name: string; message?: string };
      if (namedError.name === 'NotAuthorizedException' || namedError.name === 'UnauthorizedException') {
        throw new Error('Authentication failed. Please log in again.');
      }
      
      if (namedError.name === 'NetworkError' || namedError.message?.includes('network')) {
        throw new Error('Network error - please check your internet connection and try again');
      }
    }
    
    // Re-throw with better error message
    throw new Error(handleApiError(error));
  }
}

/**
 * Utility function to format dates for API
 */
export function formatDateForAPI(date: Date | string): string {
  if (typeof date === 'string') {
    return date;
  }
  return date.toISOString();
}

/**
 * Utility function to calculate duration between two timestamps
 */
export function calculateDuration(startTime: string, endTime: string): number {
  const start = new Date(startTime);
  const end = new Date(endTime);
  return Math.round((end.getTime() - start.getTime()) / (1000 * 60)); // Duration in minutes
}

/**
 * Utility function to validate time record data
 */
export function validateTimeRecord(data: {
  startTime: string;
  endTime?: string;
  projectName: string;
}): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!data.projectName?.trim()) {
    errors.push('Project name is required');
  }
  
  if (!data.startTime) {
    errors.push('Start time is required');
  }
  
  if (data.endTime && data.startTime) {
    const start = new Date(data.startTime);
    const end = new Date(data.endTime);
    
    if (end <= start) {
      errors.push('End time must be after start time');
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Get API base URL from configuration (deprecated - Amplify handles this)
 */
export async function getApiBaseUrl(): Promise<string> {
  // This is now handled by Amplify, but keeping for backward compatibility
  return '';
}

/**
 * Get authentication headers for API requests (deprecated - Amplify handles this)
 */
export async function getAuthHeaders(): Promise<Record<string, string>> {
  // This is now handled by Amplify automatically
  return {
    'Content-Type': 'application/json',
  };
}

/**
 * Timer API functions
 */

/**
 * Start a new active time record
 */
export async function startTimer(): Promise<TimeRecord> {
  return apiRequest('/api/time-records/start', {
    method: 'POST',
    body: {}
  });
}

/**
 * Stop an active time record
 */
export async function stopTimer(recordId: string, data: {
  project: string;
  description?: string;
  tags?: string[];
}): Promise<TimeRecord> {
  return apiRequest(`/api/time-records/stop/${recordId}`, {
    method: 'PUT',
    body: data
  });
}

/**
 * Get the currently active time record
 */
export async function getActiveTimer(): Promise<{ activeRecord: TimeRecord | null }> {
  return apiRequest('/api/time-records/active', {
    method: 'GET'
  });
}