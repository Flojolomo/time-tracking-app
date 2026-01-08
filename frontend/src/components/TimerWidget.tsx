import React, { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { TimeRecordService } from '../utils/timeRecordService';
import { ProjectAutocomplete } from './ProjectAutocomplete';
import { LoadingOverlay, ButtonLoading } from './LoadingSpinner';
import { ErrorMessage } from './ErrorMessage';
import { useNotifications } from '../contexts/NotificationContext';
import { useNetworkAwareOperation } from '../hooks/useNetworkStatus';
import { TimeRecord } from '../types';

interface StopTimerFormData {
  project: string;
  description: string;
  tags: string;
}

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
  const [showStopForm, setShowStopForm] = useState(false);
  const [error, setError] = useState<string>('');
  
  const { showSuccess, showError } = useNotifications();
  const { executeWithRetry, isRetrying } = useNetworkAwareOperation();

  // Form for stopping timer
  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting }
  } = useForm<StopTimerFormData>({
    defaultValues: {
      project: '',
      description: '',
      tags: ''
    }
  });

  // Form for editing active timer fields
  const {
    control: activeControl,
    handleSubmit: handleActiveSubmit,
    reset: resetActive,
    formState: { errors: activeErrors }
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

  const handleShowStopForm = () => {
    if (activeRecord) {
      // Pre-populate stop form with current active timer values
      reset({
        project: activeRecord.projectName || '',
        description: activeRecord.description || '',
        tags: (activeRecord.tags || []).join(', ')
      });
    }
    setShowStopForm(true);
    setError('');
  };

  const handleCancelStop = () => {
    setShowStopForm(false);
    reset();
    setError('');
  };

  const handleStopTimer = async (data: StopTimerFormData) => {
    if (!activeRecord) return;

    try {
      setError('');

      // Parse tags from comma-separated string
      const tags = data.tags
        .split(',')
        .map(tag => tag.trim())
        .filter(tag => tag.length > 0);

      const stopData = {
        project: data.project.trim(),
        description: data.description.trim() || undefined,
        tags: tags.length > 0 ? tags : undefined
      };

      await executeWithRetry(async () => {
        await TimeRecordService.stopTimer(activeRecord.id, stopData);
      });

      // Reset state
      setActiveRecord(null);
      setShowStopForm(false);
      reset();

      showSuccess('Timer Stopped', 'Your time record has been saved successfully!');
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to stop timer';
      setError(errorMessage);
      showError('Stop Failed', errorMessage);
    }
  };

  const handleUpdateActiveTimer = async (data: ActiveTimerFormData) => {
    if (!activeRecord) return;

    try {
      setError('');

      // Parse tags from comma-separated string
      const tags = data.tags
        .split(',')
        .map(tag => tag.trim())
        .filter(tag => tag.length > 0);

      const updateData: any = {};
      
      // Only include fields that have changed
      if (data.project.trim() !== (activeRecord.projectName || '')) {
        updateData.project = data.project.trim();
      }
      
      if (data.description !== (activeRecord.description || '')) {
        updateData.description = data.description;
      }
      
      const currentTags = (activeRecord.tags || []).join(', ');
      if (data.tags !== currentTags) {
        updateData.tags = tags;
      }
      
      if (data.startTime !== activeRecord.startTime) {
        updateData.startTime = data.startTime;
      }

      // Only make API call if there are changes
      if (Object.keys(updateData).length > 0) {
        await executeWithRetry(async () => {
          const updatedRecord = await TimeRecordService.updateActiveTimer(activeRecord.id, updateData);
          setActiveRecord(updatedRecord);
        });

        // Show success message only for manual saves, not auto-saves
        if (Object.keys(updateData).length > 1 || updateData.startTime) {
          showSuccess('Timer Updated', 'Your active timer has been updated successfully!');
        }
      }
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to update active timer';
      setError(errorMessage);
      showError('Update Failed', errorMessage);
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
      <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
        <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-4">
          Timer
        </h2>

        {/* Error Display */}
        {error && (
          <ErrorMessage 
            error={error} 
            onDismiss={() => setError('')}
            className="mb-4"
          />
        )}

        {/* Timer Display */}
        {activeRecord ? (
          <div className="space-y-4">
            {/* Active Timer Display */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 sm:p-6">
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
                  
                  {/* Always Show Editable Fields When Timer is Active */}
                  <form onSubmit={handleActiveSubmit(handleUpdateActiveTimer)} className="space-y-3">
                    {/* Editable Start Time */}
                    <div>
                      <label className="block text-xs font-medium text-green-700 mb-1">
                        Started at
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
                            className="w-full px-2 py-1 text-xs border border-green-300 rounded focus:outline-none focus:ring-1 focus:ring-green-500 focus:border-green-500"
                            value={field.value ? new Date(field.value).toISOString().slice(0, 16) : ''}
                            onChange={(e) => {
                              const localDateTime = e.target.value;
                              if (localDateTime) {
                                // Convert local datetime to ISO string
                                const isoString = new Date(localDateTime).toISOString();
                                field.onChange(isoString);
                                // Auto-save on change
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
                    <div>
                      <label className="block text-xs font-medium text-green-700 mb-1">
                        Project
                      </label>
                      <Controller
                        name="project"
                        control={activeControl}
                        render={({ field }) => (
                          <ProjectAutocomplete
                            value={field.value}
                            onChange={(value) => {
                              field.onChange(value);
                              // Auto-save on change
                              handleFieldUpdate('project', value);
                            }}
                            onBlur={field.onBlur}
                            placeholder="Enter project name"
                            className="text-xs"
                            disabled={isLoading || isSubmitting || isRetrying}
                          />
                        )}
                      />
                    </div>

                    {/* Editable Description */}
                    <div>
                      <label className="block text-xs font-medium text-green-700 mb-1">
                        Description
                      </label>
                      <Controller
                        name="description"
                        control={activeControl}
                        render={({ field }) => (
                          <input
                            {...field}
                            type="text"
                            className="w-full px-2 py-1 text-xs border border-green-300 rounded focus:outline-none focus:ring-1 focus:ring-green-500 focus:border-green-500"
                            placeholder="Add description (optional)"
                            onBlur={() => {
                              field.onBlur();
                              // Auto-save on blur
                              handleFieldUpdate('description', field.value);
                            }}
                            disabled={isLoading || isSubmitting || isRetrying}
                          />
                        )}
                      />
                    </div>

                    {/* Editable Tags */}
                    <div>
                      <label className="block text-xs font-medium text-green-700 mb-1">
                        Tags
                      </label>
                      <Controller
                        name="tags"
                        control={activeControl}
                        render={({ field }) => (
                          <input
                            {...field}
                            type="text"
                            className="w-full px-2 py-1 text-xs border border-green-300 rounded focus:outline-none focus:ring-1 focus:ring-green-500 focus:border-green-500"
                            placeholder="Enter tags separated by commas"
                            onBlur={() => {
                              field.onBlur();
                              // Auto-save on blur
                              handleFieldUpdate('tags', field.value);
                            }}
                            disabled={isLoading || isSubmitting || isRetrying}
                          />
                        )}
                      />
                    </div>
                  </form>
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

            {/* Stop Timer Section */}
            {!showStopForm ? (
              <div className="flex justify-center">
                <button
                  onClick={handleShowStopForm}
                  className="px-6 py-3 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors"
                  disabled={isLoading || isSubmitting || isRetrying}
                >
                  Stop Timer
                </button>
              </div>
            ) : (
              <div className="border-t pt-4">
                <h3 className="text-md font-medium text-gray-900 mb-4">
                  Complete Time Record
                </h3>
                
                <form onSubmit={handleSubmit(handleStopTimer)} className="space-y-4">
                  {/* Project Name Field - Pre-populated from active timer */}
                  <div>
                    <label htmlFor="project" className="block text-sm font-medium text-gray-700 mb-2">
                      Project Name *
                    </label>
                    <Controller
                      name="project"
                      control={control}
                      rules={{
                        required: 'Project name is required',
                        validate: (value) => value.trim().length > 0 || 'Project name cannot be empty'
                      }}
                      render={({ field }) => (
                        <ProjectAutocomplete
                          id="project"
                          value={field.value}
                          onChange={field.onChange}
                          onBlur={field.onBlur}
                          placeholder="Enter project name"
                          disabled={isLoading || isSubmitting}
                          error={!!errors.project}
                          className={errors.project ? 'border-red-500' : ''}
                        />
                      )}
                    />
                    {errors.project && (
                      <p className="mt-1 text-sm text-red-600">{errors.project.message}</p>
                    )}
                  </div>

                  {/* Description Field - Pre-populated from active timer */}
                  <div>
                    <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                      Comment
                    </label>
                    <Controller
                      name="description"
                      control={control}
                      render={({ field }) => (
                        <textarea
                          {...field}
                          id="description"
                          rows={3}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base resize-none"
                          placeholder="Add a comment about this time record (optional)"
                          disabled={isLoading || isSubmitting}
                        />
                      )}
                    />
                  </div>

                  {/* Tags Field - Pre-populated from active timer */}
                  <div>
                    <label htmlFor="tags" className="block text-sm font-medium text-gray-700 mb-2">
                      Tags
                    </label>
                    <Controller
                      name="tags"
                      control={control}
                      render={({ field }) => (
                        <input
                          {...field}
                          type="text"
                          id="tags"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base"
                          placeholder="Enter tags separated by commas (optional)"
                          disabled={isLoading || isSubmitting}
                        />
                      )}
                    />
                    <p className="mt-1 text-sm text-gray-500">
                      Separate multiple tags with commas (e.g., "meeting, client, urgent")
                    </p>
                  </div>

                  {/* Form Actions */}
                  <div className="flex flex-col sm:flex-row sm:justify-end space-y-3 sm:space-y-0 sm:space-x-3 pt-4">
                    <button
                      type="button"
                      onClick={handleCancelStop}
                      className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-colors"
                      disabled={isLoading || isSubmitting || isRetrying}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 transition-colors"
                      disabled={isLoading || isSubmitting || isRetrying}
                    >
                      {(isSubmitting || isRetrying) ? (
                        <ButtonLoading text={isRetrying ? 'Retrying...' : 'Stopping...'} />
                      ) : (
                        'Stop & Save'
                      )}
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        ) : (
          /* Start Timer Section */
          <div className="text-center space-y-4">
            <div className="bg-gray-50 rounded-lg p-6">
              <p className="text-gray-600 mb-4">
                No active timer. Click the button below to start tracking your time.
              </p>
              <button
                onClick={handleStartTimer}
                className="px-6 py-3 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors disabled:opacity-50"
                disabled={isLoading || isRetrying}
              >
                {(isLoading || isRetrying) ? (
                  <ButtonLoading text={isRetrying ? 'Retrying...' : 'Starting...'} />
                ) : (
                  'Start Timer'
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </LoadingOverlay>
  );
};