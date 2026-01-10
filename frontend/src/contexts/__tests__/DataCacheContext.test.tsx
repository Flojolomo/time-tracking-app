import { render, screen, waitFor } from '@testing-library/react';
import { DataCacheProvider, useDataCache } from '../DataCacheContext';
import { TimeRecordService } from '../../utils/timeRecordService';

// Mock the TimeRecordService
jest.mock('../../utils/timeRecordService');
const mockTimeRecordService = TimeRecordService as jest.Mocked<typeof TimeRecordService>;

// Test component that uses the cache
const TestComponent = () => {
  const { projects, tags, getProjectSuggestions, getTagSuggestions, isLoading } = useDataCache();
  
  return (
    <div>
      <div data-testid="loading">{isLoading ? 'Loading' : 'Loaded'}</div>
      <div data-testid="projects">{projects.join(',')}</div>
      <div data-testid="tags">{tags.join(',')}</div>
      <div data-testid="project-suggestions">{getProjectSuggestions('test').join(',')}</div>
      <div data-testid="tag-suggestions">{getTagSuggestions('dev').join(',')}</div>
    </div>
  );
};

describe('DataCacheContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should load and cache project and tag data', async () => {
    // Mock time records data
    const mockRecords = [
      {
        id: '1',
        userId: "123",
        projectName: 'Test Project',
        tags: ['development', 'testing'],
        startTime: '2023-01-01T10:00:00Z',
        endTime: '2023-01-01T11:00:00Z',
        duration: 60,
        description: 'Test work'
      },
      {
        id: '2',
        userId: "123",
        projectName: 'Another Project',
        tags: ['design', 'development'],
        startTime: '2023-01-01T14:00:00Z',
        endTime: '2023-01-01T15:00:00Z',
        duration: 60,
        description: 'More test work'
      }
    ];

    mockTimeRecordService.getTimeRecords.mockResolvedValue(mockRecords);

    render(
      <DataCacheProvider>
        <TestComponent />
      </DataCacheProvider>
    );

    // Initially should be loading
    expect(screen.getByTestId('loading')).toHaveTextContent('Loading');

    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('Loaded');
    });

    // Check that projects and tags are cached
    expect(screen.getByTestId('projects')).toHaveTextContent('Another Project,Test Project');
    expect(screen.getByTestId('tags')).toHaveTextContent('design,development,testing');

    // Check suggestions work
    expect(screen.getByTestId('project-suggestions')).toHaveTextContent('Test Project');
    expect(screen.getByTestId('tag-suggestions')).toHaveTextContent('development');
  });

  it('should provide filtered suggestions', async () => {
    const mockRecords = [
      {
        id: '1',
        userId: "123",
        projectName: 'Frontend Development',
        tags: ['frontend', 'react', 'typescript'],
        startTime: '2023-01-01T10:00:00Z',
        endTime: '2023-01-01T11:00:00Z',
        duration: 60,
        description: 'Frontend work'
      },
      {
        id: '2',
        userId: "123",
        projectName: 'Backend API',
        tags: ['backend', 'api', 'nodejs'],
        startTime: '2023-01-01T14:00:00Z',
        endTime: '2023-01-01T15:00:00Z',
        duration: 60,
        description: 'Backend work'
      }
    ];

    mockTimeRecordService.getTimeRecords.mockResolvedValue(mockRecords);

    const TestSuggestions = () => {
      const { getProjectSuggestions, getTagSuggestions } = useDataCache();
      
      return (
        <div>
          <div data-testid="frontend-suggestions">{getProjectSuggestions('frontend').join(',')}</div>
          <div data-testid="react-suggestions">{getTagSuggestions('react').join(',')}</div>
          <div data-testid="empty-suggestions">{getProjectSuggestions('').join(',')}</div>
        </div>
      );
    };

    render(
      <DataCacheProvider>
        <TestSuggestions />
      </DataCacheProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('frontend-suggestions')).toHaveTextContent('Frontend Development');
      expect(screen.getByTestId('react-suggestions')).toHaveTextContent('react');
      expect(screen.getByTestId('empty-suggestions')).toHaveTextContent('');
    });
  });
});