/**
 * Amplify client configuration and utilities for DynamoDB operations
 */

import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../../amplify/data/resource';

// Generate the Amplify client with proper typing
export const client = generateClient<Schema>();

/**
 * Utility function to handle Amplify errors
 */
export function handleAmplifyError(error: any): string {
  if (error?.errors && Array.isArray(error.errors)) {
    return error.errors.map((e: any) => e.message).join(', ');
  }
  
  if (error?.message) {
    return error.message;
  }
  
  return 'An unexpected error occurred';
}

/**
 * Utility function to format dates for DynamoDB
 */
export function formatDateForDB(date: Date | string): string {
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