/**
 * API client configuration and utilities for time tracking operations
 * Uses REST API endpoints deployed via AWS CDK
 */

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
 * Get API base URL from configuration
 */
export async function getApiBaseUrl(): Promise<string> {
  try {
    const response = await fetch('/amplify_outputs.json');
    const config = await response.json();
    const url = config.data?.url || '';
    // Remove trailing slash to prevent double slashes in URLs
    return url.endsWith('/') ? url.slice(0, -1) : url;
  } catch (error) {
    console.error('Failed to load API configuration:', error);
    return '';
  }
}

/**
 * Get authentication headers for API requests
 */
export async function getAuthHeaders(): Promise<Record<string, string>> {
  try {
    const { fetchAuthSession } = await import('aws-amplify/auth');
    const session = await fetchAuthSession();
    const token = session.tokens?.accessToken?.toString();
    
    return {
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : '',
    };
  } catch (error) {
    console.error('Failed to get auth headers:', error);
    return {
      'Content-Type': 'application/json',
    };
  }
}