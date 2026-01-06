/**
 * Project data access layer with CRUD operations
 */

import { client, handleAmplifyError, formatDateForDB } from './amplifyClient';
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

      const now = formatDateForDB(new Date());
      
      const result = await client.models.Project.create({
        name: input.name.trim(),
        description: input.description || '',
        color: input.color || '#3B82F6', // Default blue color
        isActive: input.isActive !== undefined ? input.isActive : true,
        createdAt: now,
        updatedAt: now
      });

      if (result.errors) {
        throw new Error(handleAmplifyError(result));
      }

      return result.data as Project;
    } catch (error) {
      throw new Error(`Failed to create project: ${handleAmplifyError(error)}`);
    }
  }

  /**
   * Get all projects for the current user
   */
  static async getProjects(activeOnly: boolean = false): Promise<Project[]> {
    try {
      let query = client.models.Project.list();

      if (activeOnly) {
        query = client.models.Project.list({
          filter: {
            isActive: {
              eq: true
            }
          }
        });
      }

      const result = await query;

      if (result.errors) {
        throw new Error(handleAmplifyError(result));
      }

      const projects = result.data as Project[];

      // Sort by name alphabetically
      projects.sort((a, b) => a.name.localeCompare(b.name));

      return projects;
    } catch (error) {
      throw new Error(`Failed to fetch projects: ${handleAmplifyError(error)}`);
    }
  }

  /**
   * Get a single project by ID
   */
  static async getProject(id: string): Promise<Project | null> {
    try {
      const result = await client.models.Project.get({ id });

      if (result.errors) {
        throw new Error(handleAmplifyError(result));
      }

      return result.data as Project | null;
    } catch (error) {
      throw new Error(`Failed to fetch project: ${handleAmplifyError(error)}`);
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
        id: input.id,
        updatedAt: formatDateForDB(new Date())
      };

      // Only include fields that are being updated
      if (input.name !== undefined) updateData.name = input.name.trim();
      if (input.description !== undefined) updateData.description = input.description;
      if (input.color !== undefined) updateData.color = input.color;
      if (input.isActive !== undefined) updateData.isActive = input.isActive;

      const result = await client.models.Project.update(updateData);

      if (result.errors) {
        throw new Error(handleAmplifyError(result));
      }

      return result.data as Project;
    } catch (error) {
      throw new Error(`Failed to update project: ${handleAmplifyError(error)}`);
    }
  }

  /**
   * Delete a project (soft delete by setting isActive to false)
   */
  static async deleteProject(id: string, hardDelete: boolean = false): Promise<void> {
    try {
      if (hardDelete) {
        const result = await client.models.Project.delete({ id });
        if (result.errors) {
          throw new Error(handleAmplifyError(result));
        }
      } else {
        // Soft delete by setting isActive to false
        await this.updateProject({ id, isActive: false });
      }
    } catch (error) {
      throw new Error(`Failed to delete project: ${handleAmplifyError(error)}`);
    }
  }

  /**
   * Get project suggestions for autocomplete based on query
   */
  static async getProjectSuggestions(query: string): Promise<Project[]> {
    try {
      const projects = await this.getProjects(true); // Only active projects
      
      if (!query.trim()) {
        return projects.slice(0, 10); // Return first 10 projects if no query
      }

      const lowerQuery = query.toLowerCase();
      const filteredProjects = projects.filter(project =>
        project.name.toLowerCase().includes(lowerQuery) ||
        (project.description && project.description.toLowerCase().includes(lowerQuery))
      );

      return filteredProjects.slice(0, 10); // Limit to 10 suggestions
    } catch (error) {
      throw new Error(`Failed to fetch project suggestions: ${handleAmplifyError(error)}`);
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
      throw new Error(`Failed to search projects: ${handleAmplifyError(error)}`);
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
      throw new Error(`Failed to find project by name: ${handleAmplifyError(error)}`);
    }
  }
}