/**
 * Time Record data access layer with CRUD operations using REST API
 */

import { handleApiError, calculateDuration, validateTimeRecord, formatDateForAPI, getApiBaseUrl, getAuthHeaders, apiRequest } from './apiClient';
import type { 
  TimeRecord, 
  CreateTimeRecordInput, 
  UpdateTimeRecordInput, 
  TimeRecordFilters 
} from '../types';

export class TimeRecordService {
  /**
   * Create a new time record
   */
  static async createTimeRecord(input: CreateTimeRecordInput): Promise<TimeRecord> {
    try {
      // Validate input data
      const validation = validateTimeRecord({
        startTime: input.startTime,
        endTime: input.endTime,
        projectName: input.projectName
      });
      
      if (!validation.isValid) {
        throw new Error(validation.errors.join(', '));
      }

      // Calculate duration if both start and end times are provided
      let duration = input.duration;
      if (input.startTime && input.endTime && !duration) {
        duration = calculateDuration(input.startTime, input.endTime);
      }

      const now = formatDateForAPI(new Date());
      
      const requestBody = {
        projectName: input.projectName,
        description: input.description || '',
        startTime: input.startTime,
        endTime: input.endTime,
        duration: duration,
        tags: input.tags || [],
        createdAt: now,
        updatedAt: now
      };

      return await apiRequest<TimeRecord>('api/time-records', {
        method: 'POST',
        body: requestBody
      });
    } catch (error) {
      throw new Error(`Failed to create time record: ${handleApiError(error)}`);
    }
  }

  /**
   * Get all time records for the current user with optional filtering
   */
  static async getTimeRecords(filters?: TimeRecordFilters): Promise<TimeRecord[]> {
    try {
      // Build query parameters
      const queryParams: Record<string, string> = {};
      if (filters?.projectName) queryParams.project = filters.projectName;
      if (filters?.startDate) queryParams.startDate = filters.startDate;
      if (filters?.endDate) queryParams.endDate = filters.endDate;
      if (filters?.tags && filters.tags.length > 0) {
        queryParams.tags = filters.tags.join(',');
      }

      const records = await apiRequest<TimeRecord[]>('api/time-records', {
        method: 'GET',
        queryParams
      });

      // Sort by start time (most recent first)
      records.sort((a: TimeRecord, b: TimeRecord) => 
        new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
      );

      return records;
    } catch (error) {
      throw new Error(`Failed to fetch time records: ${handleApiError(error)}`);
    }
  }

  /**
   * Get a single time record by ID
   */
  static async getTimeRecord(id: string): Promise<TimeRecord | null> {
    try {
      return await apiRequest<TimeRecord>(`api/time-records/${id}`, {
        method: 'GET'
      });
    } catch (error: any) {
      if (error.message.includes('404') || error.message.includes('not found')) {
        return null;
      }
      throw new Error(`Failed to fetch time record: ${handleApiError(error)}`);
    }
  }

  /**
   * Update an existing time record
   */
  static async updateTimeRecord(input: UpdateTimeRecordInput): Promise<TimeRecord> {
    try {
      // Validate input data if start/end times are being updated
      if (input.startTime || input.endTime) {
        // Get current record to validate against
        const currentRecord = await this.getTimeRecord(input.id);
        if (!currentRecord) {
          throw new Error('Time record not found');
        }

        const validation = validateTimeRecord({
          startTime: input.startTime || currentRecord.startTime,
          endTime: input.endTime || currentRecord.endTime,
          projectName: input.projectName || currentRecord.projectName
        });
        
        if (!validation.isValid) {
          throw new Error(validation.errors.join(', '));
        }
      }

      // Calculate duration if both start and end times are available
      let duration = input.duration;
      if (input.startTime && input.endTime && !duration) {
        duration = calculateDuration(input.startTime, input.endTime);
      }

      const updateData: any = {
        updatedAt: formatDateForAPI(new Date())
      };

      // Only include fields that are being updated
      if (input.projectName !== undefined) updateData.projectName = input.projectName;
      if (input.description !== undefined) updateData.description = input.description;
      if (input.startTime !== undefined) updateData.startTime = input.startTime;
      if (input.endTime !== undefined) updateData.endTime = input.endTime;
      if (duration !== undefined) updateData.duration = duration;
      if (input.tags !== undefined) updateData.tags = input.tags;

      return await apiRequest<TimeRecord>(`api/time-records/${input.id}`, {
        method: 'PUT',
        body: updateData
      });
    } catch (error) {
      throw new Error(`Failed to update time record: ${handleApiError(error)}`);
    }
  }

  /**
   * Delete a time record
   */
  static async deleteTimeRecord(id: string): Promise<void> {
    try {
      await apiRequest<void>(`api/time-records/${id}`, {
        method: 'DELETE'
      });
    } catch (error) {
      throw new Error(`Failed to delete time record: ${handleApiError(error)}`);
    }
  }

  /**
   * Get unique project names for autocomplete
   */
  static async getProjectSuggestions(query?: string): Promise<string[]> {
    try {
      const queryParams: Record<string, string> = {};
      if (query) queryParams.q = query;
      
      return await apiRequest<string[]>('api/projects/suggestions', {
        method: 'GET',
        queryParams
      });
    } catch (error) {
      throw new Error(`Failed to fetch project suggestions: ${handleApiError(error)}`);
    }
  }

  /**
   * Get time records grouped by date for calendar/timeline views
   */
  static async getTimeRecordsByDateRange(startDate: string, endDate: string): Promise<Record<string, TimeRecord[]>> {
    try {
      const records = await this.getTimeRecords({
        startDate,
        endDate
      });

      // Group records by date
      const groupedRecords: Record<string, TimeRecord[]> = {};
      
      records.forEach(record => {
        const date = new Date(record.startTime).toISOString().split('T')[0];
        if (!groupedRecords[date]) {
          groupedRecords[date] = [];
        }
        groupedRecords[date].push(record);
      });

      return groupedRecords;
    } catch (error) {
      throw new Error(`Failed to fetch time records by date range: ${handleApiError(error)}`);
    }
  }
}