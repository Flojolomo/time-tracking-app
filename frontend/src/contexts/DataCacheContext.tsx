import React, { createContext, useContext, useState, useCallback } from 'react';
import { TimeRecordService } from '../utils/timeRecordService';

interface DataCacheContextType {
  projects: string[];
  tags: string[];
  isLoading: boolean;
  refreshData: () => Promise<void>;
  ensureDataLoaded: () => Promise<void>;
  getProjectSuggestions: (query: string) => string[];
  getTagSuggestions: (query: string) => string[];
}

const DataCacheContext = createContext<DataCacheContextType | undefined>(undefined);

export const useDataCache = () => {
  const context = useContext(DataCacheContext);
  if (!context) {
    throw new Error('useDataCache must be used within a DataCacheProvider');
  }
  return context;
};

interface DataCacheProviderProps {
  children: React.ReactNode;
}

export const DataCacheProvider: React.FC<DataCacheProviderProps> = ({ children }) => {
  const [projects, setProjects] = useState<string[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const refreshData = useCallback(async () => {
    setIsLoading(true);
    try {
      const records = await TimeRecordService.getTimeRecords();
      
      const uniqueProjects = Array.from(new Set(
        records.map(record => record.projectName).filter(Boolean)
      )).sort();
      
      const allTags = records.flatMap(record => record.tags || []);
      const uniqueTags = Array.from(new Set(allTags)).sort();
      
      setProjects(uniqueProjects);
      setTags(uniqueTags);
      setLastRefresh(new Date());
    } catch (error) {
      console.error('Failed to refresh data cache:', error);
      // Keep old values on error
    } finally {
      setIsLoading(false);
    }
  }, []);

  const ensureDataLoaded = useCallback(async () => {
    if (!lastRefresh) {
      await refreshData();
    }
  }, [refreshData, lastRefresh]);

  const getProjectSuggestions = useCallback((query: string): string[] => {
    if (!query.trim()) return [];
    
    const lowerQuery = query.toLowerCase();
    return projects
      .filter(project => 
        project.toLowerCase().includes(lowerQuery) && 
        project.toLowerCase() !== lowerQuery
      )
      .slice(0, 10);
  }, [projects]);

  const getTagSuggestions = useCallback((query: string): string[] => {
    if (!query.trim()) return [];
    
    const lowerQuery = query.toLowerCase();
    return tags
      .filter(tag => 
        tag.toLowerCase().includes(lowerQuery) && 
        tag.toLowerCase() !== lowerQuery
      )
      .slice(0, 10);
  }, [tags]);

  const value: DataCacheContextType = {
    projects,
    tags,
    isLoading,
    refreshData,
    ensureDataLoaded,
    getProjectSuggestions,
    getTagSuggestions
  };

  return (
    <DataCacheContext.Provider value={value}>
      {children}
    </DataCacheContext.Provider>
  );
};