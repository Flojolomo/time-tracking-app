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

interface TimerWidgetProps {
  onTimerUpdate?: () => void; // Callback to refresh data after timer operations
}

export const TimerWidget: React.FC<TimerWidgetProps> = ({ onTimerUpdate }) => {
  const [activeRecord, setActiveRecord] = useState<TimeRecord | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showStopForm, setShowStopForm] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
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

  // Load active record on component mount
  useEffect(() => {
    loadActiveRecord();
  }, []);

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

  const handleStartTimer = async () => {
    try {
      setIsLoading(true);
      setError('');

      await executeWithRetry(async () => {
        const newRecord = await TimeRecordService.startTimer();
        setActiveRecord(newRecord);
      });

      showSuccess('Timer Started', 'Your time tracking has begun!');
      onTimerUpdate?.();
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to start timer';
      setError(errorMessage);
      showError('Start Failed', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleShowStopForm = () => {
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
      setElapsedTime(0);
      reset();

      showSuccess('Timer Stopped', 'Your time record has been saved successfully!');
      onTimerUpdate?.();
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to stop timer';
      setError(errorMessage);
      showError('Stop Failed', errorMessage);
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
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-green-700 font-medium">Timer Running</p>
                  <p className="text-2xl sm:text-3xl font-mono font-bold text-green-800">
                    {formatElapsedTime(elapsedTime)}
                  </p>
                  <p className="text-xs text-green-600 mt-1">
                    Started at {new Date(activeRecord.startTime).toLocaleTimeString()}
                  </p>
                </div>
                <div className="flex-shrink-0">
                  <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
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
                  {/* Project Name Field */}
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

                  {/* Description Field */}
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

                  {/* Tags Field */}
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