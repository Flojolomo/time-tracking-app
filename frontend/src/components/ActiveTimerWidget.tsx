import React, { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { TimeRecordService } from '../utils/timeRecordService';
import { TimeRecordForm } from './TimeRecordForm';
import { ButtonLoading } from './LoadingSpinner';
import { ErrorMessage } from './ErrorMessage';
import { useNotifications } from '../contexts/NotificationContext';
import { useNetworkAwareOperation } from '../hooks/useNetworkStatus';
import { TimeRecord } from '../types';

interface ActiveTimerFormData {
  project: string;
  description: string;
  tags: string;
  startTime: string;
}

interface TimerWidgetProps {
  activeRecord: TimeRecord;
  onRecordChange: () => void;
}

export const ActiveTimerWidget: React.FC<TimerWidgetProps> = ({ activeRecord, onRecordChange }) => {
  const [elapsedTime, setElapsedTime] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');

  const { showSuccess, showError } = useNotifications();
  const { executeWithRetry, isRetrying } = useNetworkAwareOperation();

  // Update elapsed time every second when timer is active
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    if (activeRecord) {
      const updateElapsedTime = () => {
        try {
          const start = new Date(activeRecord.startTime);
          const now = new Date();
          const elapsed = Math.floor((now.getTime() - start.getTime()) / 1000);
          setElapsedTime(elapsed);
        } catch (error) {
          console.error('Error updating elapsed time:', error);
        }
      };

      updateElapsedTime();
      interval = setInterval(updateElapsedTime, 1000);
    } else {
      setElapsedTime(0);
    }

    return () => {
      if (interval) {
        clearInterval(interval);
        interval = null;
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

  const formatDisplayTime = (utcDateString: string): string => {
    const date = new Date(utcDateString);
    return date.toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZoneName: 'short'
    });
  };

  const {
    reset: resetActive,
    getValues: getActiveValues,
    setError: setActiveError,
    formState: { isSubmitting }
  } = useForm<ActiveTimerFormData>({
    defaultValues: {
      project: '',
      description: '',
      tags: '',
      startTime: ''
    }
  });

  // Update form when active record changes
  useEffect(() => {
    resetActive({
      project: activeRecord.projectName || '',
      description: activeRecord.description || '',
      tags: (activeRecord.tags || []).join(', '),
      startTime: activeRecord.startTime
    });
  }, [activeRecord, resetActive]);

  const handleStopTimer = async () => {
    try {
      setError('');
      const currentValues = getActiveValues();

      if (!currentValues.project || currentValues.project.trim() === '') {
        setError('Project name is required to stop the timer');
        setActiveError('project', {
          type: 'required',
          message: 'Project name is required to stop the timer'
        });
        return;
      }

      const tags = currentValues.tags
        .split(',')
        .map(tag => tag.trim())
        .filter(tag => tag.length > 0);

      const stopData = {
        project: currentValues.project.trim(),
        description: currentValues.description?.trim() || undefined,
        tags: tags.length > 0 ? tags : undefined
      };

      setIsLoading(true);

      await executeWithRetry(async () => {
        await TimeRecordService.stopTimer(activeRecord.id, stopData);
      });

      onRecordChange();
      showSuccess('Timer Stopped', 'Your time record has been saved successfully!');
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to stop timer';
      setError(errorMessage);
      showError('Stop Failed', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelTimer = async () => {
    try {
      setError('');
      setIsLoading(true);

      await executeWithRetry(async () => {
        await TimeRecordService.deleteTimeRecord(activeRecord.id);
      });

      onRecordChange();
      showSuccess('Timer Cancelled', 'Active timer has been cancelled and discarded.');
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to cancel timer';
      setError(errorMessage);
      showError('Cancel Failed', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFieldUpdate = useCallback((fieldName: string, value: string) => {
    // Simple field update without debouncing for now
    console.log(`Field ${fieldName} updated to:`, value);
  }, []);

  return (
    <div className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200 rounded-xl p-6 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-green-100 rounded-full -translate-y-16 translate-x-16 opacity-50"></div>
      <div className="absolute bottom-0 left-0 w-24 h-24 bg-green-100 rounded-full translate-y-12 -translate-x-12 opacity-30"></div>

      <div className="relative">
        {/* Error Display */}
        {error && (
          <ErrorMessage
            error={error}
            onDismiss={() => setError('')}
            className="mb-6"
          />
        )}

        {/* Header with Clock Icon and Stop Button */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
          <div className="flex items-center space-x-3 min-w-0 flex-1">
            <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center shadow-lg flex-shrink-0">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 min-w-0">
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-green-500 rounded-full animate-pulse shadow-lg flex-shrink-0"></div>
                <span className="text-sm font-semibold text-green-800 uppercase tracking-wide">
                  Recording
                </span>
              </div>
              <div className="px-3 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full whitespace-nowrap">
                Active Session
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <button
              onClick={handleCancelTimer}
              className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white text-sm font-medium rounded-lg transition-colors shadow-md hover:shadow-lg transform hover:scale-105 disabled:opacity-50"
              disabled={isLoading || isSubmitting || isRetrying}
            >
              {(isSubmitting || isRetrying) ? (
                <ButtonLoading text="Cancelling..." />
              ) : (
                'Cancel'
              )}
            </button>
            <button
              onClick={handleStopTimer}
              className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white text-sm font-medium rounded-lg transition-colors shadow-md hover:shadow-lg transform hover:scale-105 disabled:opacity-50"
              disabled={isLoading || isSubmitting || isRetrying}
            >
              {(isSubmitting || isRetrying) ? (
                <ButtonLoading text={isRetrying ? 'Retrying...' : 'Stopping...'} />
              ) : (
                'Stop & Save'
              )}
            </button>
          </div>
        </div>

        {/* Timer Display */}
        <div className="mb-6">
          <div className="text-3xl sm:text-4xl md:text-5xl font-mono font-bold text-green-900 tracking-tight break-all">
            {formatElapsedTime(elapsedTime)}
          </div>
          <p className="text-sm text-green-600 mt-1 break-all">
            Started at {formatDisplayTime(activeRecord.startTime)}
          </p>
        </div>

        {/* TimeRecordForm for active timer */}
        <TimeRecordForm
          initialData={activeRecord}
          onSubmit={async () => { console.log("Submitted") }}
          onFieldUpdate={handleFieldUpdate}
          backgroundStyle="bg-gradient-to-br from-green-50 to-emerald-50"
        />
      </div>
    </div>
  );
};