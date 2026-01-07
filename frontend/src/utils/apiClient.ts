/**
 * API client configuration and utilities for time tracking operations
 * Uses Amplify REST API with IAM authentication
 */

import { get, post, put, del } from 'aws-amplify/api';
import { fetchWithRetry, handleApiResponse } from './networkUtils';

/**
 * Utility function to handle API errors
 */
export function handleApiError(error: any): string {
  if (error?.response?.data?.message) {
    return error.response.data.message;
  }
  
  if (error?.message) {
    return error.message;
  }
  
  return 'An unexpected error occurred';
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
    const { method = 'GET', body, queryParams } = options || {};
    
    // Remove leading slash and API base URL since Amplify handles this
    const cleanPath = path.replace(/^https?:\/\/[^\/]+/, '').replace(/^\//, '');
    
    let response;
    
    switch (method) {
      case 'GET':
        response = await get({
          apiName: 'Time Tracking API',
          path: cleanPath,
          options: {
            queryParams,
          },
        });
        break;
      case 'POST':
        response = await post({
          apiName: 'Time Tracking API',
          path: cleanPath,
          options: {
            body,
            queryParams,
          },
        });
        break;
      case 'PUT':
        response = await put({
          apiName: 'Time Tracking API',
          path: cleanPath,
          options: {
            body,
            queryParams,
          },
        });
        break;
      case 'DELETE':
        response = await del({
          apiName: 'Time Tracking API',
          path: cleanPath,
          options: {
            queryParams,
          },
        });
        break;
      default:
        throw new Error(`Unsupported HTTP method: ${method}`);
    }
    
    return (await response.response).body as T;
  } catch (error: any) {
    // Add context to network errors
    if (error.isNetworkError) {
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