/**
 * Project data access layer with CRUD operations using REST API
 */

import { handleApiError, formatDateForAPI, getApiBaseUrl, getAuthHeaders } from './apiClient';
import type { 
  Project, 
  CreateProjectInput, 
  UpdateProjectInput 
} from '../types';

export class ProjectService {
  /**
   * Create a new project
   */
  static async createProject(input: CreateProjectInput): Promise<Project> {
    try {
      if (!input.name?.trim()) {
        throw new Error('Project name is required');
      }

      const now = formatDateForAPI(new Date());
      const apiBaseUrl = await getApiBaseUrl();
      const headers = await getAuthHeaders();
      
      const requestBody = {
        name: input.name.trim(),
        description: input.description || '',
        color: input.color || '#3B82F6', // Default blue color
        isActive: input.isActive !== undefined ? input.isActive : true,
        createdAt: now,
        updatedAt: now
      };

      const response = await fetch(`${apiBaseUrl}/api/projects`, {
        method: 'POST',
        headers,
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      throw new Error(`Failed to create project: ${handleApiError(error)}`);
    }
  }

  /**
   * Get all projects for the current user
   */
  static async getProjects(activeOnly: boolean = false): Promise<Project[]> {
    try {
      const apiBaseUrl = await getApiBaseUrl();
      const headers = await getAuthHeaders();
      
      const queryParams = activeOnly ? '?active=true' : '';
      
      const response = await fetch(`${apiBaseUrl}/api/projects${queryParams}`, {
        method: 'GET',
        headers
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      const projects = await response.json();

      // Sort by name alphabetically
      projects.sort((a: Project, b: Project) => a.name.localeCompare(b.name));

      return projects;
    } catch (error) {
      throw new Error(`Failed to fetch projects: ${handleApiError(error)}`);
    }
  }

  /**
   * Get a single project by ID
   */
  static async getProject(id: string): Promise<Project | null> {
    try {
      const apiBaseUrl = await getApiBaseUrl();
      const headers = await getAuthHeaders();
      
      const response = await fetch(`${apiBaseUrl}/api/projects/${id}`, {
        method: 'GET',
        headers
      });

      if (response.status === 404) {
        return null;
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      throw new Error(`Failed to fetch project: ${handleApiError(error)}`);
    }
  }

  /**
   * Update an existing project
   */
  static async updateProject(input: UpdateProjectInput): Promise<Project> {
    try {
      if (input.name !== undefined && !input.name.trim()) {
        throw new Error('Project name cannot be empty');
      }

      const updateData: any = {
        updatedAt: formatDateForAPI(new Date())
      };

      // Only include fields that are being updated
      if (input.name !== undefined) updateData.name = input.name.trim();
      if (input.description !== undefined) updateData.description = input.description;
      if (input.color !== undefined) updateData.color = input.color;
      if (input.isActive !== undefined) updateData.isActive = input.isActive;

      const apiBaseUrl = await getApiBaseUrl();
      const headers = await getAuthHeaders();

      const response = await fetch(`${apiBaseUrl}/api/projects/${input.id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(updateData)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      throw new Error(`Failed to update project: ${handleApiError(error)}`);
    }
  }

  /**
   * Delete a project (soft delete by setting isActive to false)
   */
  static async deleteProject(id: string, hardDelete: boolean = false): Promise<void> {
    try {
      if (hardDelete) {
        const apiBaseUrl = await getApiBaseUrl();
        const headers = await getAuthHeaders();

        const response = await fetch(`${apiBaseUrl}/api/projects/${id}`, {
          method: 'DELETE',
          headers
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
        }
      } else {
        // Soft delete by setting isActive to false
        await this.updateProject({ id, isActive: false });
      }
    } catch (error) {
      throw new Error(`Failed to delete project: ${handleApiError(error)}`);
    }
  }

  /**
   * Get project suggestions for autocomplete based on query
   */
  static async getProjectSuggestions(query: string): Promise<string[]> {
    try {
      const apiBaseUrl = await getApiBaseUrl();
      const headers = await getAuthHeaders();
      
      const response = await fetch(
        `${apiBaseUrl}/api/projects/suggestions?q=${encodeURIComponent(query)}&limit=10`,
        {
          method: 'GET',
          headers
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return data.suggestions || [];
    } catch (error) {
      throw new Error(`Failed to fetch project suggestions: ${handleApiError(error)}`);
    }
  }

  /**
   * Search projects by name or description
   */
  static async searchProjects(searchTerm: string): Promise<Project[]> {
    try {
      const projects = await this.getProjects();
      
      if (!searchTerm.trim()) {
        return projects;
      }

      const lowerSearchTerm = searchTerm.toLowerCase();
      return projects.filter(project =>
        project.name.toLowerCase().includes(lowerSearchTerm) ||
        (project.description && project.description.toLowerCase().includes(lowerSearchTerm))
      );
    } catch (error) {
      throw new Error(`Failed to search projects: ${handleApiError(error)}`);
    }
  }

  /**
   * Get project by name (for finding existing projects)
   */
  static async getProjectByName(name: string): Promise<Project | null> {
    try {
      const projects = await this.getProjects();
      return projects.find(project => 
        project.name.toLowerCase() === name.toLowerCase()
      ) || null;
    } catch (error) {
      throw new Error(`Failed to find project by name: ${handleApiError(error)}`);
    }
  }
}