import React, { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { TimeRecordService } from '../utils/timeRecordService';
import { ProjectAutocomplete } from './ProjectAutocomplete';
import { LoadingOverlay, ButtonLoading } from './LoadingSpinner';
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
}

export const TimerWidget: React.FC<TimerWidgetProps> = ({ }) => {
  const [activeRecord, setActiveRecord] = useState<TimeRecord | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');
  
  const { showSuccess, showError } = useNotifications();
  const { executeWithRetry, isRetrying } = useNetworkAwareOperation();

  // Form for editing active timer fields
  const {
    control: activeControl,
    reset: resetActive,
    getValues: getActiveValues,
    setError: setActiveError,
    formState: { errors: activeErrors, isSubmitting }
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
    } catch (error: any) {
      console.error('Failed to load active record:', error);
      setError(error.message || 'Failed to load timer status');
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

  const handleStartTimer = async () => {
    try {
      setIsLoading(true);
      setError('');

      await executeWithRetry(async () => {
        const newRecord = await TimeRecordService.startTimer();
        setActiveRecord(newRecord);
      });

      showSuccess('Timer Started', 'Your time tracking has begun!');
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to start timer';
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

      showSuccess('Timer Stopped', 'Your time record has been saved successfully!');
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to stop timer';
      setError(errorMessage);
      showError('Stop Failed', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-save function for individual field changes
  const handleFieldUpdate = async (fieldName: string, value: any) => {
    if (!activeRecord) return;

    try {
      const updateData: any = {};
      
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

      if (updateData[fieldName] !== currentValue) {
        await executeWithRetry(async () => {
          const updatedRecord = await TimeRecordService.updateActiveTimer(activeRecord.id, updateData);
          setActiveRecord(updatedRecord);
        });
      }
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to update active timer';
      setError(errorMessage);
      showError('Update Failed', errorMessage);
    }
  };

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
                  <div className="flex items-start justify-between mb-6">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-4">
                        <div className="flex items-center space-x-2">
                          <div className="w-4 h-4 bg-green-500 rounded-full animate-pulse shadow-lg"></div>
                          <span className="text-sm font-semibold text-green-800 uppercase tracking-wide">
                            Recording
                          </span>
                        </div>
                        <div className="px-3 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                          Active Session
                        </div>
                      </div>
                      
                      <div className="mb-6">
                        <div className="text-4xl sm:text-5xl font-mono font-bold text-green-900 tracking-tight">
                          {formatElapsedTime(elapsedTime)}
                        </div>
                        <p className="text-sm text-green-600 mt-1">
                          Started at {new Date(activeRecord.startTime).toLocaleTimeString()}
                        </p>
                      </div>

                      {/* Editable Fields in Compact Cards */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                        {/* Editable Start Time */}
                        <div className="bg-white/60 backdrop-blur-sm rounded-lg p-4 border border-green-200/50">
                          <label className="block text-xs font-semibold text-green-700 mb-2 uppercase tracking-wide">
                            Started At
                          </label>
                          <Controller
                            name="startTime"
                            control={activeControl}
                            rules={{
                              required: 'Start time is required',
                              validate: (value) => {
                                const startTime = new Date(value);
                                const now = new Date();
                                if (startTime > now) {
                                  return 'Start time cannot be in the future';
                                }
                                return true;
                              }
                            }}
                            render={({ field }) => (
                              <input
                                {...field}
                                type="datetime-local"
                                className="w-full px-3 py-2 text-sm border border-green-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white/80 transition-all"
                                value={field.value ? new Date(field.value).toISOString().slice(0, 16) : ''}
                                onChange={(e) => {
                                  const localDateTime = e.target.value;
                                  if (localDateTime) {
                                    const isoString = new Date(localDateTime).toISOString();
                                    field.onChange(isoString);
                                    handleFieldUpdate('startTime', isoString);
                                  }
                                }}
                                disabled={isLoading || isSubmitting || isRetrying}
                              />
                            )}
                          />
                          {activeErrors.startTime && (
                            <p className="mt-1 text-xs text-red-600">{activeErrors.startTime.message}</p>
                          )}
                        </div>

                        {/* Editable Project */}
                        <div className="bg-white/60 backdrop-blur-sm rounded-lg p-4 border border-green-200/50">
                          <label className="block text-xs font-semibold text-green-700 mb-2 uppercase tracking-wide">
                            Project *
                          </label>
                          <Controller
                            name="project"
                            control={activeControl}
                            rules={{
                              required: 'Project name is required to stop the timer'
                            }}
                            render={({ field }) => (
                              <ProjectAutocomplete
                                value={field.value}
                                onChange={(value) => {
                                  field.onChange(value);
                                  handleFieldUpdate('project', value);
                                  // Clear error when user starts typing
                                  if (value.trim()) {
                                    setError('');
                                  }
                                }}
                                onBlur={field.onBlur}
                                placeholder="Enter project name"
                                className="text-sm"
                                disabled={isLoading || isSubmitting || isRetrying}
                              />
                            )}
                          />
                          {activeErrors.project && (
                            <p className="mt-1 text-xs text-red-600">{activeErrors.project.message}</p>
                          )}
                        </div>
                      </div>

                      {/* Description and Tags in Full Width */}
                      <div className="space-y-4">
                        {/* Editable Description */}
                        <div className="bg-white/60 backdrop-blur-sm rounded-lg p-4 border border-green-200/50">
                          <label className="block text-xs font-semibold text-green-700 mb-2 uppercase tracking-wide">
                            Description
                          </label>
                          <Controller
                            name="description"
                            control={activeControl}
                            render={({ field }) => (
                              <textarea
                                {...field}
                                rows={2}
                                className="w-full px-3 py-2 text-sm border border-green-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white/80 transition-all resize-none"
                                placeholder="What are you working on?"
                                onBlur={() => {
                                  field.onBlur();
                                  handleFieldUpdate('description', field.value);
                                }}
                                disabled={isLoading || isSubmitting || isRetrying}
                              />
                            )}
                          />
                        </div>

                        {/* Editable Tags */}
                        <div className="bg-white/60 backdrop-blur-sm rounded-lg p-4 border border-green-200/50">
                          <label className="block text-xs font-semibold text-green-700 mb-2 uppercase tracking-wide">
                            Tags
                          </label>
                          <Controller
                            name="tags"
                            control={activeControl}
                            render={({ field }) => (
                              <input
                                {...field}
                                type="text"
                                className="w-full px-3 py-2 text-sm border border-green-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white/80 transition-all"
                                placeholder="meeting, development, client"
                                onBlur={() => {
                                  field.onBlur();
                                  handleFieldUpdate('tags', field.value);
                                }}
                                disabled={isLoading || isSubmitting || isRetrying}
                              />
                            )}
                          />
                          <p className="mt-1 text-xs text-green-600">
                            Separate tags with commas
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    {/* Timer Icon and Stop Button */}
                    <div className="flex-shrink-0 ml-6 text-center">
                      <div className="w-16 h-16 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center mb-4 shadow-lg">
                        <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
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