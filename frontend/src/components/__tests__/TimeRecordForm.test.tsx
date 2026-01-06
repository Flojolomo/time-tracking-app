/**
 * Basic unit tests for TimeRecordForm component
 * Tests focus on core functionality and validation logic
 */

import { render, screen } from '@testing-library/react';
import { TimeRecordForm } from '../TimeRecordForm';
import { TimeRecord } from '../../types';

// Mock the API client utilities
jest.mock('../../utils/apiClient', () => ({
  calculateDuration: jest.fn((start: string, end: string) => {
    const startTime = new Date(start).getTime();
    const endTime = new Date(end).getTime();
    return Math.round((endTime - startTime) / (1000 * 60));
  })
}));

describe('TimeRecordForm', () => {
  const mockOnSubmit = jest.fn();
  const mockOnCancel = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Component Rendering', () => {
    it('should render form with all required fields', () => {
      render(<TimeRecordForm onSubmit={mockOnSubmit} />);

      expect(screen.getByLabelText(/project name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/date/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/start time/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/end time/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/comment/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/tags/i)).toBeInTheDocument();
    });

    it('should render create form title when no initial data', () => {
      render(<TimeRecordForm onSubmit={mockOnSubmit} />);
      
      expect(screen.getByText('New Time Record')).toBeInTheDocument();
      expect(screen.getByText('Create Record')).toBeInTheDocument();
    });

    it('should render edit form title when initial data provided', () => {
      const initialData: TimeRecord = {
        id: '1',
        userId: 'user1',
        projectName: 'Test Project',
        startTime: '2024-01-01T10:00:00Z',
        endTime: '2024-01-01T11:00:00Z',
        description: 'Test description',
        tags: ['test', 'work']
      };

      render(<TimeRecordForm onSubmit={mockOnSubmit} initialData={initialData} />);
      
      expect(screen.getByText('Edit Time Record')).toBeInTheDocument();
      expect(screen.getByText('Update Record')).toBeInTheDocument();
    });

    it('should show cancel button when onCancel provided', () => {
      render(<TimeRecordForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);
      
      expect(screen.getByText('Cancel')).toBeInTheDocument();
    });
  });

  describe('Initial Data Population', () => {
    it('should populate form with initial data', () => {
      const initialData: TimeRecord = {
        id: '1',
        userId: 'user1',
        projectName: 'Test Project',
        startTime: '2024-01-01T10:00:00Z',
        endTime: '2024-01-01T11:00:00Z',
        description: 'Test description',
        tags: ['test', 'work']
      };

      render(<TimeRecordForm onSubmit={mockOnSubmit} initialData={initialData} />);

      expect(screen.getByDisplayValue('Test Project')).toBeInTheDocument();
      expect(screen.getByDisplayValue('2024-01-01')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Test description')).toBeInTheDocument();
      expect(screen.getByDisplayValue('test, work')).toBeInTheDocument();
    });
  });

  describe('Loading States', () => {
    it('should disable form when loading', () => {
      render(<TimeRecordForm onSubmit={mockOnSubmit} isLoading={true} />);

      expect(screen.getByLabelText(/project name/i)).toBeDisabled();
      expect(screen.getByLabelText(/date/i)).toBeDisabled();
      expect(screen.getByLabelText(/start time/i)).toBeDisabled();
      expect(screen.getByLabelText(/end time/i)).toBeDisabled();
      expect(screen.getByText('Create Record')).toBeDisabled();
    });
  });

  describe('Form Structure', () => {
    it('should have proper form structure with required field indicators', () => {
      render(<TimeRecordForm onSubmit={mockOnSubmit} />);

      // Check for required field indicators (*)
      expect(screen.getByText('Project Name *')).toBeInTheDocument();
      expect(screen.getByText('Date *')).toBeInTheDocument();
      expect(screen.getByText('Start Time *')).toBeInTheDocument();
      expect(screen.getByText('End Time *')).toBeInTheDocument();
      
      // Check for optional fields (no *)
      expect(screen.getByText('Comment')).toBeInTheDocument();
      expect(screen.getByText('Tags')).toBeInTheDocument();
    });

    it('should have proper input types for each field', () => {
      render(<TimeRecordForm onSubmit={mockOnSubmit} />);

      expect(screen.getByLabelText(/project name/i)).toHaveAttribute('type', 'text');
      expect(screen.getByLabelText(/date/i)).toHaveAttribute('type', 'date');
      expect(screen.getByLabelText(/start time/i)).toHaveAttribute('type', 'time');
      expect(screen.getByLabelText(/end time/i)).toHaveAttribute('type', 'time');
      expect(screen.getByLabelText(/tags/i)).toHaveAttribute('type', 'text');
    });
  });
});