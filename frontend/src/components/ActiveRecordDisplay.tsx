import React, { useState, useEffect } from 'react';
import { TimeRecordService } from '../utils/timeRecordService';
import { TimeRecord } from '../types';

interface ActiveRecordDisplayProps {
  refreshTrigger?: number; // Used to trigger refresh from parent
}

export const ActiveRecordDisplay: React.FC<ActiveRecordDisplayProps> = ({ refreshTrigger }) => {
  const [activeRecord, setActiveRecord] = useState<TimeRecord | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // Load active record
  const loadActiveRecord = async () => {
    try {
      setIsLoading(true);
      const response = await TimeRecordService.getActiveTimer();
      setActiveRecord(response.activeRecord);
    } catch (error) {
      console.error('Failed to load active record:', error);
      setActiveRecord(null);
    } finally {
      setIsLoading(false);
    }
  };

  // Load active record on component mount and when refreshTrigger changes
  useEffect(() => {
    loadActiveRecord();
  }, [refreshTrigger]);

  // Update elapsed time every second when timer is active
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (activeRecord) {
      const updateElapsedTime = () => {
        const start = new Date(activeRecord.startTime);
        const now = new Date();
        const elapsed = Math.floor((now.getTime() - start.getTime()) / 1000);
        setElapsedTime(elapsed);
      };

      // Update immediately
      updateElapsedTime();
      
      // Then update every second
      interval = setInterval(updateElapsedTime, 1000);
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [activeRecord]);

  const formatElapsedTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
          <div className="h-8 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  return null
};