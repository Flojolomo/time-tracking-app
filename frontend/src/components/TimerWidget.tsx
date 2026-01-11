import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { TimeRecordService } from '../utils/timeRecordService';
import { TimeRecordForm } from './TimeRecordForm';
import { LoadingOverlay, ButtonLoading } from './LoadingSpinner';
import { ErrorMessage } from './ErrorMessage';
import { useNotifications } from '../contexts/NotificationContext';
import { useNetworkAwareOperation } from '../hooks/useNetworkStatus';
import { useDataCache } from '../contexts/DataCacheContext';
import { TimeRecord } from '../types';

interface ActiveTimerFormData {
  project: string;
  description: string;
  tags: string;
  startTime: string;
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface TimerWidgetProps { }

export const TimerWidget: React.FC<TimerWidgetProps> = () => {
  const [activeRecord, setActiveRecord] = useState<TimeRecord | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');

  const { showSuccess, showError } = useNotifications();
  const { executeWithRetry, isRetrying } = useNetworkAwareOperation();
  const { refreshData } = useDataCache();

  // Debounce timer refs
  const debounceTimers = useRef<{ [key: string]: NodeJS.Timeout }>({});

  // Cleanup debounce timers on unmount
  useEffect(() => {
    return () => {
      Object.values(debounceTimers.current).forEach(timer => {
        if (timer) clearTimeout(timer);
      });
    };
  }, []);

  // Form for editing active timer fields
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

  // Load active record on component mount
  useEffect(() => {
    loadActiveRecord();
  }, []);

  // Update active timer form when active record changes
  useEffect(() => {
    if (activeRecord) {
      resetActive({
        project: activeRecord.projectName || '',
        description: activeRecord.description || '',
        tags: (activeRecord.tags || []).join(', '),
        startTime: activeRecord.startTime
      });
    }
  }, [activeRecord, resetActive]);

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

  const loadActiveRecord = async () => {
    try {
      setError('');
      const response = await TimeRecordService.getActiveTimer();
      setActiveRecord(response.activeRecord);
    } catch (error: unknown) {
      console.error('Failed to load active record:', error);
      setError(error instanceof Error ? error.message : 'Failed to load timer status');
    }
  };

  const formatElapsedTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Helper function to format time for display with timezone consideration
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

  const handleStartTimer = async () => {
    try {
      setIsLoading(true);
      setError('');

      await executeWithRetry(async () => {
        const newRecord = await TimeRecordService.startTimer();
        setActiveRecord(newRecord);
      });

      showSuccess('Timer Started', 'Your time tracking has begun!');
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to start timer';
      setError(errorMessage);
      showError('Start Failed', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStopTimer = async () => {
    if (!activeRecord) return;

    try {
      setError('');

      // Get current values from the active timer form
      const currentValues = getActiveValues();

      // Validate required fields
      if (!currentValues.project || currentValues.project.trim() === '') {
        setError('Project name is required to stop the timer');
        // Trigger validation on the project field
        setActiveError('project', {
          type: 'required',
          message: 'Project name is required to stop the timer'
        });
        return;
      }

      // Parse tags from comma-separated string
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

      // Reset state
      setActiveRecord(null);

      // Refresh cached data after stopping timer
      refreshData();

      showSuccess('Timer Stopped', 'Your time record has been saved successfully!');
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to stop timer';
      setError(errorMessage);
      showError('Stop Failed', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Debounced auto-save function for individual field changes
  const debouncedFieldUpdate = useCallback((fieldName: string, value: string) => {
    // Clear existing timer for this field
    if (debounceTimers.current[fieldName]) {
      clearTimeout(debounceTimers.current[fieldName]);
    }

    // Set new timer
    debounceTimers.current[fieldName] = setTimeout(async () => {
      if (!activeRecord) return;

      try {
        const updateData: Record<string, unknown> = {};

        if (fieldName === 'project') {
          updateData.project = value.trim();
        } else if (fieldName === 'description') {
          updateData.description = value;
        } else if (fieldName === 'tags') {
          const tags = value.split(',').map((tag: string) => tag.trim()).filter(Boolean);
          updateData.tags = tags;
        } else if (fieldName === 'startTime') {
          updateData.startTime = value;
        }

        // Only update if there's actually a change
        const currentValue = fieldName === 'project' ? activeRecord.projectName :
          fieldName === 'description' ? activeRecord.description :
            fieldName === 'tags' ? (activeRecord.tags || []).join(', ') :
              fieldName === 'startTime' ? activeRecord.startTime : '';

        // More robust comparison for different field types
        let hasChanged = false;
        if (fieldName === 'tags') {
          const currentTags = (activeRecord.tags || []).join(', ');
          const newTags = value.split(',').map((tag: string) => tag.trim()).filter(Boolean).join(', ');
          hasChanged = currentTags !== newTags;
        } else {
          hasChanged = String(updateData[fieldName] || '') !== String(currentValue || '');
        }

        if (hasChanged) {
          await executeWithRetry(async () => {
            const updatedRecord = await TimeRecordService.updateActiveTimer(activeRecord.id, updateData);
            setActiveRecord(updatedRecord);
          });
        }
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to update active timer';
        setError(errorMessage);
        showError('Update Failed', errorMessage);
      }

      // Clean up the timer reference
      delete debounceTimers.current[fieldName];
    }, 500); // 0.5 second debounce
  }, [activeRecord, executeWithRetry, showError]);

  // Auto-save function for individual field changes (now debounced)
  const handleFieldUpdate = useCallback((fieldName: string, value: string) => {
    debouncedFieldUpdate(fieldName, value);
  }, [debouncedFieldUpdate]);

  return (
    <LoadingOverlay isLoading={isLoading} text="Loading timer...">
      <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-500 to-purple-600 px-6 py-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-white/20 rounded-lg">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-white">
              Time Tracker
            </h2>
          </div>
        </div>

        <div className="p-6">
          {/* Error Display */}
          {error && (
            <ErrorMessage
              error={error}
              onDismiss={() => setError('')}
              className="mb-6"
            />
          )}

          {/* Timer Display */}
          {activeRecord ? (
            <div className="space-y-6">
              {/* Active Timer Display */}
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200 rounded-xl p-6 relative overflow-hidden">
                {/* Background decoration */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-green-100 rounded-full -translate-y-16 translate-x-16 opacity-50"></div>
                <div className="absolute bottom-0 left-0 w-24 h-24 bg-green-100 rounded-full translate-y-12 -translate-x-12 opacity-30"></div>

                <div className="relative">
                  {/* Header with Clock Icon and Stop Button */}
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
                    {/* Clock Icon and Status */}
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

                    {/* Stop Button */}
                    <button
                      onClick={handleStopTimer}
                      className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white text-sm font-medium rounded-lg transition-colors shadow-md hover:shadow-lg transform hover:scale-105 disabled:opacity-50 w-full sm:w-auto flex-shrink-0"
                      disabled={isLoading || isSubmitting || isRetrying}
                    >
                      {(isSubmitting || isRetrying) ? (
                        <ButtonLoading text={isRetrying ? 'Retrying...' : 'Stopping...'} />
                      ) : (
                        'Stop & Save'
                      )}
                    </button>
                  </div>

                  {/* Timer Display */}
                  <div className="mb-6">
                    <div className="text-3xl sm:text-4xl md:text-5xl font-mono font-bold text-green-900 tracking-tight break-all">
                      {formatElapsedTime(elapsedTime)}
                    </div>
                    <p className="text-sm text-green-600 mt-1 break-all">
                      Started at {activeRecord ? formatDisplayTime(activeRecord.startTime) : ''}
                    </p>
                  </div>

                  {/* TimeRecordForm for active timer */}
                  <TimeRecordForm
                    initialData={activeRecord}
                    onSubmit={async () => { console.log("Submitted") }}
                    onFieldUpdate={handleFieldUpdate}
                    backgroundStyle="bg-gradient-to-br from-green-50 to-emerald-50"
                  // "bg-gradient-to-br from-gray-50 to-gray-100 border-2 border-gray-200"

                  />

                </div>
              </div>
            </div>
          ) : (
            /* Start Timer Section */
            <div className="text-center py-12">
              <div className="max-w-md mx-auto">
                <div className="w-24 h-24 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <svg className="w-12 h-12 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>

                <h3 className="text-xl font-semibold text-gray-900 mb-3">
                  Ready to Track Time?
                </h3>
                <p className="text-gray-600 mb-8">
                  Start your timer to begin tracking your work session. You can add project details and descriptions while the timer is running.
                </p>

                <button
                  onClick={handleStartTimer}
                  className="px-8 py-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-semibold rounded-xl hover:from-green-600 hover:to-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-all transform hover:scale-105 shadow-lg disabled:opacity-50"
                  disabled={isLoading || isRetrying}
                >
                  {(isLoading || isRetrying) ? (
                    <ButtonLoading text={isRetrying ? 'Retrying...' : 'Starting...'} />
                  ) : (
                    <div className="flex items-center space-x-2">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h8m-9-4V8a3 3 0 016 0v2M7 16a3 3 0 006 0v-2" />
                      </svg>
                      <span>Start Timer</span>
                    </div>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </LoadingOverlay>
  );
};