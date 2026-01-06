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