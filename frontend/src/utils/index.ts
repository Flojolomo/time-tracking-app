// Utility functions

export const formatDuration = (minutes: number): string => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}h ${mins}m`;
};

export const formatDate = (date: string): string => {
  return new Date(date).toLocaleDateString();
};

export const formatTime = (time: string): string => {
  return new Date(time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

// Export data access services
export { TimeRecordService } from './timeRecordService';
export { ProjectService } from './projectService';
export * from './amplifyClient';