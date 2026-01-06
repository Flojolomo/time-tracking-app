// Type definitions for the application

export interface TimeRecord {
  id: string;
  userId: string;
  projectName: string;
  description?: string;
  startTime: string; // ISO 8601 timestamp
  endTime?: string; // ISO 8601 timestamp
  duration?: number; // Duration in minutes
  tags?: string[];
  createdAt?: string; // ISO 8601 timestamp
  updatedAt?: string; // ISO 8601 timestamp
}

export interface CreateTimeRecordInput {
  projectName: string;
  description?: string;
  startTime: string;
  endTime?: string;
  duration?: number;
  tags?: string[];
}

export interface UpdateTimeRecordInput {
  id: string;
  projectName?: string;
  description?: string;
  startTime?: string;
  endTime?: string;
  duration?: number;
  tags?: string[];
}

export interface TimeRecordFilters {
  startDate?: string; // YYYY-MM-DD format
  endDate?: string; // YYYY-MM-DD format
  projectName?: string;
  tags?: string[];
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  color?: string;
  userId: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateProjectInput {
  name: string;
  description?: string;
  color?: string;
  isActive?: boolean;
}

export interface UpdateProjectInput {
  id: string;
  name?: string;
  description?: string;
  color?: string;
  isActive?: boolean;
}

export interface User {
  userId: string;
  email: string;
  name?: string;
}

// Authentication types
export interface AuthUser {
  userId: string;
  email: string;
  name?: string;
  accessToken: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface SignupCredentials {
  email: string;
  password: string;
  name?: string;
}

export interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  signup: (credentials: SignupCredentials) => Promise<void>;
  logout: () => Promise<void>;
  error: string | null;
}