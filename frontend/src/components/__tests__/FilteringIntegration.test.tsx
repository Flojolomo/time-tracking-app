import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ViewStateProvider } from '../../contexts/ViewStateContext';
import { DataCacheProvider } from '../../contexts/DataCacheContext';
import { TimeRecordService } from '../../utils/timeRecordService';
import { RecordsPage } from '../../pages/RecordsPage';

// Mock the TimeRecordService
jest.mock('../../utils/timeRecordService');
const mockTimeRecordService = TimeRecordService as jest.Mocked<typeof TimeRecordService>;

// Mock react-router-dom
jest.mock('react-router-dom', () => ({
  useNavigate: () => jest.fn(),
}));

describe('Filtering Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock project suggestions
    mockTimeRecordService.getProjectSuggestions.mockResolvedValue([
      'Project A',
      'Project B',
      'Test Project'
    ]);
    
    // Mock time records with different projects and tags
    mockTimeRecordService.getTimeRecords.mockResolvedValue([
      {
        id: '1',
        userId: 'user1',
        projectName: 'Project A',
        description: 'Frontend work',
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
        description: 'Backend work',
        startTime: '2024-01-01T11:00:00Z',
        endTime: '2024-01-01T12:00:00Z',
        duration: 60,
        tags: ['backend', 'api'],
        createdAt: '2024-01-01T11:00:00Z',
        updatedAt: '2024-01-01T11:00:00Z'
      }
    ]);
  });

  const renderWithProvider = (component: React.ReactElement) => {
    return render(
      <ViewStateProvider>
        <DataCacheProvider>
          {component}
        </DataCacheProvider>
      </ViewStateProvider>
    );
  };

  it('integrates filtering with time record views', async () => {
    renderWithProvider(<RecordsPage />);

    // Check that the filters component is rendered
    expect(screen.getByText('Filters')).toBeInTheDocument();
    expect(screen.getByLabelText('Project')).toBeInTheDocument();
    expect(screen.getByLabelText('Tags')).toBeInTheDocument();

    // Verify that TimeRecordService.getTimeRecords is called initially
    await waitFor(() => {
      expect(mockTimeRecordService.getTimeRecords).toHaveBeenCalled();
    });
  });

  it('applies project filter correctly', async () => {
    renderWithProvider(<RecordsPage />);

    const projectInput = screen.getByLabelText('Project');
    
    // Type in project filter
    fireEvent.change(projectInput, { target: { value: 'Project A' } });
    
    // Wait for the filter to be applied
    await waitFor(() => {
      // Check that getTimeRecords is called with project filter
      const calls = mockTimeRecordService.getTimeRecords.mock.calls;
      const lastCall = calls[calls.length - 1];
      expect(lastCall[0]).toEqual(expect.objectContaining({
        projectName: 'Project A'
      }));
    });
  });

  it('applies tag filter correctly', async () => {
    renderWithProvider(<RecordsPage />);

    const tagInput = screen.getByLabelText('Tags');
    
    // Add a tag filter
    fireEvent.change(tagInput, { target: { value: 'frontend' } });
    fireEvent.keyDown(tagInput, { key: 'Enter' });
    
    // Wait for the filter to be applied
    await waitFor(() => {
      // Check that getTimeRecords is called with tag filter
      const calls = mockTimeRecordService.getTimeRecords.mock.calls;
      const lastCall = calls[calls.length - 1];
      expect(lastCall[0]).toEqual(expect.objectContaining({
        tags: ['frontend']
      }));
    });
  });

  it('combines multiple filters correctly', async () => {
    renderWithProvider(<RecordsPage />);

    const projectInput = screen.getByLabelText('Project');
    const tagInput = screen.getByLabelText('Tags');
    
    // Apply project filter
    fireEvent.change(projectInput, { target: { value: 'Project A' } });
    
    // Apply tag filter
    fireEvent.change(tagInput, { target: { value: 'react' } });
    fireEvent.keyDown(tagInput, { key: 'Enter' });
    
    // Wait for both filters to be applied
    await waitFor(() => {
      const calls = mockTimeRecordService.getTimeRecords.mock.calls;
      const lastCall = calls[calls.length - 1];
      expect(lastCall[0]).toEqual(expect.objectContaining({
        projectName: 'Project A',
        tags: ['react']
      }));
    });
  });
});