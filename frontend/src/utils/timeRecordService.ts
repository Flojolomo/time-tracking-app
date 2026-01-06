/**
 * Time Record data access layer with CRUD operations
 */

import { client, handleAmplifyError, calculateDuration, validateTimeRecord, formatDateForDB } from './amplifyClient';
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

      const now = formatDateForDB(new Date());
      
      const result = await client.models.TimeRecord.create({
        projectName: input.projectName,
        description: input.description || '',
        startTime: input.startTime,
        endTime: input.endTime,
        duration: duration,
        tags: input.tags || [],
        createdAt: now,
        updatedAt: now
      });

      if (result.errors) {
        throw new Error(handleAmplifyError(result));
      }

      return result.data as TimeRecord;
    } catch (error) {
      throw new Error(`Failed to create time record: ${handleAmplifyError(error)}`);
    }
  }

  /**
   * Get all time records for the current user with optional filtering
   */
  static async getTimeRecords(filters?: TimeRecordFilters): Promise<TimeRecord[]> {
    try {
      let query = client.models.TimeRecord.list();

      // Apply filters if provided
      if (filters?.projectName) {
        query = client.models.TimeRecord.list({
          filter: {
            projectName: {
              eq: filters.projectName
            }
          }
        });
      }

      const result = await query;

      if (result.errors) {
        throw new Error(handleAmplifyError(result));
      }

      let records = result.data as TimeRecord[];

      // Apply date range filtering (client-side for now)
      if (filters?.startDate || filters?.endDate) {
        records = records.filter(record => {
          const recordDate = new Date(record.startTime).toISOString().split('T')[0];
          
          if (filters.startDate && recordDate < filters.startDate) {
            return false;
          }
          
          if (filters.endDate && recordDate > filters.endDate) {
            return false;
          }
          
          return true;
        });
      }

      // Apply tag filtering
      if (filters?.tags && filters.tags.length > 0) {
        records = records.filter(record => {
          if (!record.tags || record.tags.length === 0) {
            return false;
          }
          return filters.tags!.some(tag => record.tags!.includes(tag));
        });
      }

      // Sort by start time (most recent first)
      records.sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());

      return records;
    } catch (error) {
      throw new Error(`Failed to fetch time records: ${handleAmplifyError(error)}`);
    }
  }

  /**
   * Get a single time record by ID
   */
  static async getTimeRecord(id: string): Promise<TimeRecord | null> {
    try {
      const result = await client.models.TimeRecord.get({ id });

      if (result.errors) {
        throw new Error(handleAmplifyError(result));
      }

      return result.data as TimeRecord | null;
    } catch (error) {
      throw new Error(`Failed to fetch time record: ${handleAmplifyError(error)}`);
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
        id: input.id,
        updatedAt: formatDateForDB(new Date())
      };

      // Only include fields that are being updated
      if (input.projectName !== undefined) updateData.projectName = input.projectName;
      if (input.description !== undefined) updateData.description = input.description;
      if (input.startTime !== undefined) updateData.startTime = input.startTime;
      if (input.endTime !== undefined) updateData.endTime = input.endTime;
      if (duration !== undefined) updateData.duration = duration;
      if (input.tags !== undefined) updateData.tags = input.tags;

      const result = await client.models.TimeRecord.update(updateData);

      if (result.errors) {
        throw new Error(handleAmplifyError(result));
      }

      return result.data as TimeRecord;
    } catch (error) {
      throw new Error(`Failed to update time record: ${handleAmplifyError(error)}`);
    }
  }

  /**
   * Delete a time record
   */
  static async deleteTimeRecord(id: string): Promise<void> {
    try {
      const result = await client.models.TimeRecord.delete({ id });

      if (result.errors) {
        throw new Error(handleAmplifyError(result));
      }
    } catch (error) {
      throw new Error(`Failed to delete time record: ${handleAmplifyError(error)}`);
    }
  }

  /**
   * Get unique project names for autocomplete
   */
  static async getProjectSuggestions(query?: string): Promise<string[]> {
    try {
      const records = await this.getTimeRecords();
      
      // Extract unique project names
      const projectNames = [...new Set(records.map(record => record.projectName))];
      
      // Filter by query if provided
      if (query) {
        const lowerQuery = query.toLowerCase();
        return projectNames.filter(name => 
          name.toLowerCase().includes(lowerQuery)
        );
      }
      
      return projectNames;
    } catch (error) {
      throw new Error(`Failed to fetch project suggestions: ${handleAmplifyError(error)}`);
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
      throw new Error(`Failed to fetch time records by date range: ${handleAmplifyError(error)}`);
    }
  }
}