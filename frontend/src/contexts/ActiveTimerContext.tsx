import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { TimeRecordService } from '../utils/timeRecordService';
import { TimeRecord } from '../types';

interface ActiveTimerContextType {
  activeRecord: TimeRecord | null;
  isLoading: boolean;
  error: string | null;
  loadActiveRecord: () => Promise<void>;
  updateActiveRecord: (updatedRecord: TimeRecord) => void;
  clearError: () => void;
}

const ActiveTimerContext = createContext<ActiveTimerContextType | undefined>(undefined);

export const ActiveTimerProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [activeRecord, setActiveRecord] = useState<TimeRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadActiveRecord = useCallback(async (): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await TimeRecordService.getActiveTimer();
      setActiveRecord(response.activeRecord);
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : 'Failed to load timer status');
      setActiveRecord(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updateActiveRecord = useCallback((updatedRecord: TimeRecord) => {
    setActiveRecord(prev => ({ ...prev, ...updatedRecord }));
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Load active record on mount
  useEffect(() => {
    loadActiveRecord();
  }, [loadActiveRecord]);

  return (
    <ActiveTimerContext.Provider value={{
      activeRecord,
      isLoading,
      error,
      loadActiveRecord,
      updateActiveRecord,
      clearError
    }}>
      {children}
    </ActiveTimerContext.Provider>
  );
};

export const useActiveTimer = () => {
  const context = useContext(ActiveTimerContext);
  if (context === undefined) {
    throw new Error('useActiveTimer must be used within an ActiveTimerProvider');
  }
  return context;
};