/**
 * API client configuration and utilities for time tracking operations
 * Uses Amplify REST API with IAM authentication
 */

import { get, post, put, del } from 'aws-amplify/api';
import { fetchAuthSession } from 'aws-amplify/auth';

/**
 * Utility function to handle API errors
 */
export function handleApiError(error: any): string {
  if (error?.response?.body?.message) {
    return error.response.body.message;
  }
  
  if (error?.message) {
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
 */
export async function apiRequest<T>(
  path: string,
  options?: {
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
    body?: any;
    queryParams?: Record<string, string>;
  }
): Promise<T> {
  try {
    // Ensure user has valid credentials
    await ensureCredentials();
    
    const { method = 'GET', body: requestBody, queryParams } = options || {};
    
    // Remove leading slash and API base URL since Amplify handles this
    const cleanPath = path.replace(/^https?:\/\/[^\/]+/, '').replace(/^\//, '');
    
    let response;
    
    const requestOptions = {
      queryParams: queryParams || {},
      ...(requestBody && { body: requestBody })
    };
    
    switch (method) {
      case 'GET':
        response = await get({
          apiName: 'Time Tracking API',
          path: cleanPath,
          options: {
            queryParams: queryParams || {},
          },
        });
        break;
      case 'POST':
        response = await post({
          apiName: 'Time Tracking API',
          path: cleanPath,
          options: requestOptions,
        });
        break;
      case 'PUT':
        response = await put({
          apiName: 'Time Tracking API',
          path: cleanPath,
          options: requestOptions,
        });
        break;
      case 'DELETE':
        response = await del({
          apiName: 'Time Tracking API',
          path: cleanPath,
          options: {
            queryParams: queryParams || {},
          },
        });
        break;
      default:
        throw new Error(`Unsupported HTTP method: ${method}`);
    }
    
    const { body } = await response.response;
    const data = await body.json();
    return data as T;
  } catch (error: any) {
    console.error('API request failed:', error);
    
    // Handle specific AWS/Amplify errors
    if (error.name === 'NotAuthorizedException' || error.name === 'UnauthorizedException') {
      throw new Error('Authentication failed. Please log in again.');
    }
    
    if (error.name === 'NetworkError' || error.message?.includes('network')) {
      throw new Error('Network error - please check your internet connection and try again');
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
export async function startTimer(): Promise<any> {
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
}): Promise<any> {
  return apiRequest(`/api/time-records/stop/${recordId}`, {
    method: 'PUT',
    body: data
  });
}

/**
 * Get the currently active time record
 */
export async function getActiveTimer(): Promise<{ activeRecord: any | null }> {
  return apiRequest('/api/time-records/active', {
    method: 'GET'
  });
}