/**
 * Basic integration tests for the data access layer
 * These tests verify that the services are properly structured and can be imported
 */

import { TimeRecordService } from '../timeRecordService';
import { ProjectService } from '../projectService';
import { validateTimeRecord, calculateDuration, formatDateForDB } from '../amplifyClient';

describe('Data Access Layer', () => {
  describe('TimeRecordService', () => {
    it('should have all required CRUD methods', () => {
      expect(typeof TimeRecordService.createTimeRecord).toBe('function');
      expect(typeof TimeRecordService.getTimeRecords).toBe('function');
      expect(typeof TimeRecordService.getTimeRecord).toBe('function');
      expect(typeof TimeRecordService.updateTimeRecord).toBe('function');
      expect(typeof TimeRecordService.deleteTimeRecord).toBe('function');
      expect(typeof TimeRecordService.getProjectSuggestions).toBe('function');
      expect(typeof TimeRecordService.getTimeRecordsByDateRange).toBe('function');
    });
  });

  describe('ProjectService', () => {
    it('should have all required CRUD methods', () => {
      expect(typeof ProjectService.createProject).toBe('function');
      expect(typeof ProjectService.getProjects).toBe('function');
      expect(typeof ProjectService.getProject).toBe('function');
      expect(typeof ProjectService.updateProject).toBe('function');
      expect(typeof ProjectService.deleteProject).toBe('function');
      expect(typeof ProjectService.getProjectSuggestions).toBe('function');
      expect(typeof ProjectService.searchProjects).toBe('function');
      expect(typeof ProjectService.getProjectByName).toBe('function');
    });
  });

  describe('Utility Functions', () => {
    describe('validateTimeRecord', () => {
      it('should validate required fields', () => {
        const result = validateTimeRecord({
          startTime: '2024-01-01T10:00:00Z',
          endTime: '2024-01-01T11:00:00Z',
          projectName: 'Test Project'
        });
        
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should reject empty project name', () => {
        const result = validateTimeRecord({
          startTime: '2024-01-01T10:00:00Z',
          endTime: '2024-01-01T11:00:00Z',
          projectName: ''
        });
        
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Project name is required');
      });

      it('should reject end time before start time', () => {
        const result = validateTimeRecord({
          startTime: '2024-01-01T11:00:00Z',
          endTime: '2024-01-01T10:00:00Z',
          projectName: 'Test Project'
        });
        
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('End time must be after start time');
      });
    });

    describe('calculateDuration', () => {
      it('should calculate duration in minutes', () => {
        const duration = calculateDuration(
          '2024-01-01T10:00:00Z',
          '2024-01-01T11:30:00Z'
        );
        
        expect(duration).toBe(90); // 1.5 hours = 90 minutes
      });
    });

    describe('formatDateForDB', () => {
      it('should format Date object to ISO string', () => {
        const date = new Date('2024-01-01T10:00:00Z');
        const formatted = formatDateForDB(date);
        
        expect(formatted).toBe('2024-01-01T10:00:00.000Z');
      });

      it('should return string as-is', () => {
        const dateString = '2024-01-01T10:00:00Z';
        const formatted = formatDateForDB(dateString);
        
        expect(formatted).toBe(dateString);
      });
    });
  });
});