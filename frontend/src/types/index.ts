// Type definitions for the application

export interface TimeRecord {
  recordId: string;
  userId: string;
  project: string;
  startTime: string;
  endTime: string;
  date: string;
  duration: number;
  comment: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Project {
  projectName: string;
  lastUsed: string;
  totalRecords: number;
  totalDuration: number;
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