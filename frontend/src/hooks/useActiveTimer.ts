import { useState, useCallback } from 'react';
import { TimeRecordService } from '../utils/timeRecordService';
import { TimeRecord } from '../types';

interface UseActiveTimerReturn {
  activeRecord: TimeRecord | null;
  isLoading: boolean;
  error: string | null;
  loadActiveRecord: () => Promise<void>;
  clearError: () => void;
}

export const useActiveTimer = (): UseActiveTimerReturn => {
  const [activeRecord, setActiveRecord] = useState<TimeRecord | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);


  console.log("useActiveTimer")
  const loadActiveRecord = useCallback(async (): Promise<void> => {
    console.log('Loading active record...');
    try {
      setIsLoading(true);
      setError(null);
      const response = await TimeRecordService.getActiveTimer();
      setActiveRecord(response.activeRecord);
    } catch (error: unknown) {
      console.error('Failed to load active record:', error);
      setError(error instanceof Error ? error.message : 'Failed to load timer status');
      setActiveRecord(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    activeRecord,
    isLoading,
    error,
    loadActiveRecord,
    clearError
  };
};