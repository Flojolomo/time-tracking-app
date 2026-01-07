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

  if (!activeRecord) {
    return null; // Don't show anything if no active record
  }

  return (
    <div className="bg-green-50 border border-green-200 rounded-lg p-4 sm:p-6 mb-6">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="flex items-center space-x-2 mb-2">
            <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
            <h3 className="text-sm font-medium text-green-800">Active Timer</h3>
          </div>
          
          <div className="mb-2">
            <p className="text-2xl sm:text-3xl font-mono font-bold text-green-900">
              {formatElapsedTime(elapsedTime)}
            </p>
          </div>
          
          <div className="text-sm text-green-700 space-y-1">
            <p>Started at {new Date(activeRecord.startTime).toLocaleTimeString()}</p>
            {activeRecord.projectName && (
              <p>Project: {activeRecord.projectName}</p>
            )}
            {activeRecord.description && (
              <p>Description: {activeRecord.description}</p>
            )}
          </div>
        </div>
        
        <div className="flex-shrink-0 ml-4">
          <div className="text-center">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-2">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-xs text-green-600 font-medium">Running</p>
          </div>
        </div>
      </div>
    </div>
  );
};