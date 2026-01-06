/**
 * Basic unit tests for ProjectAutocomplete component
 * Tests focus on core functionality and user interactions
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ProjectAutocomplete } from '../ProjectAutocomplete';

// Mock the API client utilities
jest.mock('../../utils/apiClient', () => ({
  getApiBaseUrl: jest.fn().mockResolvedValue('https://api.example.com'),
  getAuthHeaders: jest.fn().mockResolvedValue({
    'Content-Type': 'application/json',
    'Authorization': 'Bearer mock-token'
  }),
  handleApiError: jest.fn((error) => error.message || 'Unknown error')
}));

// Mock fetch
global.fetch = jest.fn();

describe('ProjectAutocomplete', () => {
  const mockOnChange = jest.fn();
  const mockOnBlur = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockClear();
  });

  describe('Component Rendering', () => {
    it('should render input field with correct props', () => {
      render(
        <ProjectAutocomplete
          value="Test Project"
          onChange={mockOnChange}
          placeholder="Enter project name"
          id="project-input"
        />
      );

      const input = screen.getByRole('textbox');
      expect(input).toBeInTheDocument();
      expect(input).toHaveValue('Test Project');
      expect(input).toHaveAttribute('placeholder', 'Enter project name');
      expect(input).toHaveAttribute('id', 'project-input');
    });

    it('should render disabled input when disabled prop is true', () => {
      render(
        <ProjectAutocomplete
          value=""
          onChange={mockOnChange}
          disabled={true}
        />
      );

      const input = screen.getByRole('textbox');
      expect(input).toBeDisabled();
    });

    it('should apply error styling when error prop is true', () => {
      render(
        <ProjectAutocomplete
          value=""
          onChange={mockOnChange}
          error={true}
        />
      );

      const input = screen.getByRole('textbox');
      expect(input).toHaveClass('border-red-500');
    });
  });

  describe('User Interactions', () => {
    it('should call onChange when user types', () => {
      render(
        <ProjectAutocomplete
          value=""
          onChange={mockOnChange}
        />
      );

      const input = screen.getByRole('textbox');
      fireEvent.change(input, { target: { value: 'New Project' } });

      expect(mockOnChange).toHaveBeenCalledWith('New Project');
    });

    it('should call onBlur when input loses focus', async () => {
      render(
        <ProjectAutocomplete
          value=""
          onChange={mockOnChange}
          onBlur={mockOnBlur}
        />
      );

      const input = screen.getByRole('textbox');
      fireEvent.focus(input);
      fireEvent.blur(input);

      // Wait for the delayed blur handler
      await waitFor(() => {
        expect(mockOnBlur).toHaveBeenCalled();
      }, { timeout: 200 });
    });
  });

  describe('Suggestions Functionality', () => {
    it('should fetch suggestions when user types', async () => {
      const mockSuggestions = {
        suggestions: ['Project A', 'Project B', 'Project C'],
        count: 3
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue(mockSuggestions)
      });

      render(
        <ProjectAutocomplete
          value="Project"
          onChange={mockOnChange}
        />
      );

      // Wait for debounced API call
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          'https://api.example.com/api/projects/suggestions?q=Project&limit=10',
          expect.objectContaining({
            method: 'GET',
            headers: expect.objectContaining({
              'Content-Type': 'application/json',
              'Authorization': 'Bearer mock-token'
            })
          })
        );
      }, { timeout: 500 });
    });

    it('should display suggestions when available', async () => {
      const mockSuggestions = {
        suggestions: ['Project A', 'Project B'],
        count: 2
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue(mockSuggestions)
      });

      render(
        <ProjectAutocomplete
          value="Project"
          onChange={mockOnChange}
        />
      );

      // Wait for suggestions to appear
      await waitFor(() => {
        expect(screen.getByText('Project A')).toBeInTheDocument();
        expect(screen.getByText('Project B')).toBeInTheDocument();
      }, { timeout: 500 });
    });

    it('should handle API errors gracefully', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      render(
        <ProjectAutocomplete
          value="Project"
          onChange={mockOnChange}
        />
      );

      // Wait for error to be handled
      await waitFor(() => {
        expect(screen.getByText(/Failed to load suggestions/)).toBeInTheDocument();
      }, { timeout: 500 });
    });

    it('should select suggestion when clicked', async () => {
      const mockSuggestions = {
        suggestions: ['Project A', 'Project B'],
        count: 2
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue(mockSuggestions)
      });

      render(
        <ProjectAutocomplete
          value="Project"
          onChange={mockOnChange}
        />
      );

      // Wait for suggestions to appear
      await waitFor(() => {
        expect(screen.getByText('Project A')).toBeInTheDocument();
      }, { timeout: 500 });

      // Click on first suggestion
      fireEvent.click(screen.getByText('Project A'));

      expect(mockOnChange).toHaveBeenCalledWith('Project A');
    });
  });
});