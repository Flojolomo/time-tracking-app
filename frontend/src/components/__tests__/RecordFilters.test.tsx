import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { RecordFilters } from '../RecordFilters';
import { TimeRecordFilters } from '../../types';
import { TimeRecordService } from '../../utils/timeRecordService';

// Mock the TimeRecordService
jest.mock('../../utils/timeRecordService');
const mockTimeRecordService = TimeRecordService as jest.Mocked<typeof TimeRecordService>;

describe('RecordFilters', () => {
  const mockOnFiltersChange = jest.fn();
  
  const defaultFilters: TimeRecordFilters = {
    startDate: '2024-01-01',
    endDate: '2024-01-31'
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock project suggestions
    mockTimeRecordService.getProjectSuggestions.mockResolvedValue([
      'Project A',
      'Project B',
      'Test Project'
    ]);
    
    // Mock time records for tag extraction
    mockTimeRecordService.getTimeRecords.mockResolvedValue([
      {
        id: '1',
        userId: 'user1',
        projectName: 'Project A',
        startTime: '2024-01-01T09:00:00Z',
        endTime: '2024-01-01T10:00:00Z',
        duration: 60,
        tags: ['frontend', 'react'],
        createdAt: '2024-01-01T09:00:00Z',
        updatedAt: '2024-01-01T09:00:00Z'
      },
      {
        id: '2',
        userId: 'user1',
        projectName: 'Project B',
        startTime: '2024-01-01T11:00:00Z',
        endTime: '2024-01-01T12:00:00Z',
        duration: 60,
        tags: ['backend', 'api'],
        createdAt: '2024-01-01T11:00:00Z',
        updatedAt: '2024-01-01T11:00:00Z'
      }
    ]);
  });

  it('renders filter controls correctly', () => {
    render(
      <RecordFilters
        filters={defaultFilters}
        onFiltersChange={mockOnFiltersChange}
      />
    );

    expect(screen.getByText('Filters')).toBeInTheDocument();
    expect(screen.getByLabelText('Project')).toBeInTheDocument();
    expect(screen.getByLabelText('Tags')).toBeInTheDocument();
  });

  it('handles project filter changes', async () => {
    render(
      <RecordFilters
        filters={defaultFilters}
        onFiltersChange={mockOnFiltersChange}
      />
    );

    const projectInput = screen.getByLabelText('Project');
    
    // Type in project input
    fireEvent.change(projectInput, { target: { value: 'Project A' } });
    
    // Wait for suggestions to load
    await waitFor(() => {
      expect(mockTimeRecordService.getProjectSuggestions).toHaveBeenCalledWith('Project A');
    });

    // Simulate selecting a project (by pressing Enter or clicking)
    fireEvent.blur(projectInput);
    
    expect(mockOnFiltersChange).toHaveBeenCalledWith({
      ...defaultFilters,
      projectName: 'Project A'
    });
  });

  it('handles tag filter additions', async () => {
    render(
      <RecordFilters
        filters={defaultFilters}
        onFiltersChange={mockOnFiltersChange}
      />
    );

    const tagInput = screen.getByLabelText('Tags');
    
    // Type a tag and press Enter
    fireEvent.change(tagInput, { target: { value: 'frontend' } });
    fireEvent.keyDown(tagInput, { key: 'Enter' });
    
    expect(mockOnFiltersChange).toHaveBeenCalledWith({
      ...defaultFilters,
      tags: ['frontend']
    });
  });

  it('handles tag filter removals', () => {
    const filtersWithTags: TimeRecordFilters = {
      ...defaultFilters,
      tags: ['frontend', 'react']
    };

    render(
      <RecordFilters
        filters={filtersWithTags}
        onFiltersChange={mockOnFiltersChange}
      />
    );

    // Find and click the remove button for the first tag
    const removeButtons = screen.getAllByRole('button');
    const frontendRemoveButton = removeButtons.find(button => 
      button.getAttribute('aria-label')?.includes('Remove') || 
      button.textContent === '×' ||
      button.querySelector('svg')
    );
    
    if (frontendRemoveButton) {
      fireEvent.click(frontendRemoveButton);
      
      expect(mockOnFiltersChange).toHaveBeenCalledWith({
        ...defaultFilters,
        tags: ['react'] // frontend should be removed
      });
    }
  });

  it('clears all filters when clear button is clicked', () => {
    const filtersWithData: TimeRecordFilters = {
      ...defaultFilters,
      projectName: 'Project A',
      tags: ['frontend']
    };

    render(
      <RecordFilters
        filters={filtersWithData}
        onFiltersChange={mockOnFiltersChange}
      />
    );

    const clearButton = screen.getByText('Clear all filters');
    fireEvent.click(clearButton);
    
    expect(mockOnFiltersChange).toHaveBeenCalledWith({
      startDate: defaultFilters.startDate,
      endDate: defaultFilters.endDate
    });
  });

  it('shows active filters summary', () => {
    const filtersWithData: TimeRecordFilters = {
      ...defaultFilters,
      projectName: 'Project A',
      tags: ['frontend', 'react']
    };

    render(
      <RecordFilters
        filters={filtersWithData}
        onFiltersChange={mockOnFiltersChange}
      />
    );

    expect(screen.getByText('Active filters:')).toBeInTheDocument();
    expect(screen.getByText('Project: Project A')).toBeInTheDocument();
    expect(screen.getByText('Tags: 2')).toBeInTheDocument();
  });

  it('does not show clear button when no filters are active', () => {
    render(
      <RecordFilters
        filters={defaultFilters}
        onFiltersChange={mockOnFiltersChange}
      />
    );

    expect(screen.queryByText('Clear all filters')).not.toBeInTheDocument();
  });
});