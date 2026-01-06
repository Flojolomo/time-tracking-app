import React, { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { CreateTimeRecordInput, UpdateTimeRecordInput, TimeRecord } from '../types';
import { calculateDuration } from '../utils/apiClient';
import { ProjectAutocomplete } from './ProjectAutocomplete';

interface TimeRecordFormProps {
  initialData?: TimeRecord;
  onSubmit: (data: CreateTimeRecordInput | UpdateTimeRecordInput) => Promise<void>;
  onCancel?: () => void;
  isLoading?: boolean;
}

interface FormData {
  projectName: string;
  startTime: string;
  endTime: string;
  date: string;
  description: string;
  tags: string;
}

export const TimeRecordForm: React.FC<TimeRecordFormProps> = ({
  initialData,
  onSubmit,
  onCancel,
  isLoading = false
}) => {
  const [submitError, setSubmitError] = useState<string>('');
  
  // Initialize form with default values
  const {
    control,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
    reset
  } = useForm<FormData>({
    defaultValues: {
      projectName: initialData?.projectName || '',
      startTime: initialData?.startTime ? formatTimeForInput(initialData.startTime) : '',
      endTime: initialData?.endTime ? formatTimeForInput(initialData.endTime) : '',
      date: initialData?.startTime ? formatDateForInput(initialData.startTime) : formatDateForInput(new Date().toISOString()),
      description: initialData?.description || '',
      tags: initialData?.tags?.join(', ') || ''
    }
  });

  // Watch form values for validation
  const watchedValues = watch();

  // Reset form when initialData changes
  useEffect(() => {
    if (initialData) {
      reset({
        projectName: initialData.projectName,
        startTime: formatTimeForInput(initialData.startTime),
        endTime: initialData.endTime ? formatTimeForInput(initialData.endTime) : '',
        date: formatDateForInput(initialData.startTime),
        description: initialData.description || '',
        tags: initialData.tags?.join(', ') || ''
      });
    }
  }, [initialData, reset]);

  // Custom validation function
  const validateForm = (data: FormData) => {
    const errors: Record<string, string> = {};

    // Required field validation
    if (!data.projectName.trim()) {
      errors.projectName = 'Project name is required';
    }

    if (!data.startTime) {
      errors.startTime = 'Start time is required';
    }

    if (!data.endTime) {
      errors.endTime = 'End time is required';
    }

    if (!data.date) {
      errors.date = 'Date is required';
    }

    // Time logic validation
    if (data.startTime && data.endTime && data.date) {
      const startDateTime = new Date(`${data.date}T${data.startTime}`);
      const endDateTime = new Date(`${data.date}T${data.endTime}`);

      if (endDateTime <= startDateTime) {
        errors.endTime = 'End time must be after start time';
      }
    }

    return errors;
  };

  const onFormSubmit = async (data: FormData) => {
    try {
      setSubmitError('');
      
      // Validate form data
      const validationErrors = validateForm(data);
      if (Object.keys(validationErrors).length > 0) {
        // Set first error as submit error
        setSubmitError(Object.values(validationErrors)[0]);
        return;
      }

      // Combine date and time into ISO timestamps
      const startDateTime = new Date(`${data.date}T${data.startTime}`);
      const endDateTime = new Date(`${data.date}T${data.endTime}`);

      // Parse tags from comma-separated string
      const tags = data.tags
        .split(',')
        .map(tag => tag.trim())
        .filter(tag => tag.length > 0);

      // Calculate duration
      const duration = calculateDuration(startDateTime.toISOString(), endDateTime.toISOString());

      // Prepare submission data
      const submissionData = {
        projectName: data.projectName.trim(),
        description: data.description.trim() || undefined,
        startTime: startDateTime.toISOString(),
        endTime: endDateTime.toISOString(),
        duration,
        tags: tags.length > 0 ? tags : undefined
      };

      // Add ID for updates
      if (initialData) {
        await onSubmit({
          id: initialData.id,
          ...submissionData
        } as UpdateTimeRecordInput);
      } else {
        await onSubmit(submissionData as CreateTimeRecordInput);
      }

    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Failed to save time record');
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 max-w-2xl mx-auto">
      <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4 sm:mb-6">
        {initialData ? 'Edit Time Record' : 'New Time Record'}
      </h2>

      <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-4 sm:space-y-6">
        {/* Project Name Field */}
        <div>
          <label htmlFor="projectName" className="block text-sm font-medium text-gray-700 mb-2">
            Project Name *
          </label>
          <Controller
            name="projectName"
            control={control}
            rules={{
              required: 'Project name is required',
              validate: (value) => value.trim().length > 0 || 'Project name cannot be empty'
            }}
            render={({ field }) => (
              <ProjectAutocomplete
                id="projectName"
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                placeholder="Enter project name"
                disabled={isLoading || isSubmitting}
                error={!!errors.projectName}
                className={errors.projectName ? 'border-red-500' : ''}
              />
            )}
          />
          {errors.projectName && (
            <p className="mt-1 text-sm text-red-600">{errors.projectName.message}</p>
          )}
        </div>

        {/* Date Field */}
        <div>
          <label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-2">
            Date *
          </label>
          <Controller
            name="date"
            control={control}
            rules={{ required: 'Date is required' }}
            render={({ field }) => (
              <input
                {...field}
                type="date"
                id="date"
                className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base ${
                  errors.date ? 'border-red-500' : 'border-gray-300'
                }`}
                disabled={isLoading || isSubmitting}
              />
            )}
          />
          {errors.date && (
            <p className="mt-1 text-sm text-red-600">{errors.date.message}</p>
          )}
        </div>

        {/* Time Fields Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Start Time Field */}
          <div>
            <label htmlFor="startTime" className="block text-sm font-medium text-gray-700 mb-2">
              Start Time *
            </label>
            <Controller
              name="startTime"
              control={control}
              rules={{ required: 'Start time is required' }}
              render={({ field }) => (
                <input
                  {...field}
                  type="time"
                  id="startTime"
                  className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base ${
                    errors.startTime ? 'border-red-500' : 'border-gray-300'
                  }`}
                  disabled={isLoading || isSubmitting}
                />
              )}
            />
            {errors.startTime && (
              <p className="mt-1 text-sm text-red-600">{errors.startTime.message}</p>
            )}
          </div>

          {/* End Time Field */}
          <div>
            <label htmlFor="endTime" className="block text-sm font-medium text-gray-700 mb-2">
              End Time *
            </label>
            <Controller
              name="endTime"
              control={control}
              rules={{
                required: 'End time is required',
                validate: (value) => {
                  if (!value || !watchedValues.startTime || !watchedValues.date) return true;
                  
                  const startDateTime = new Date(`${watchedValues.date}T${watchedValues.startTime}`);
                  const endDateTime = new Date(`${watchedValues.date}T${value}`);
                  
                  return endDateTime > startDateTime || 'End time must be after start time';
                }
              }}
              render={({ field }) => (
                <input
                  {...field}
                  type="time"
                  id="endTime"
                  className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base ${
                    errors.endTime ? 'border-red-500' : 'border-gray-300'
                  }`}
                  disabled={isLoading || isSubmitting}
                />
              )}
            />
            {errors.endTime && (
              <p className="mt-1 text-sm text-red-600">{errors.endTime.message}</p>
            )}
          </div>
        </div>

        {/* Duration Display */}
        {watchedValues.startTime && watchedValues.endTime && watchedValues.date && (
          <div className="bg-gray-50 p-3 rounded-md">
            <p className="text-sm text-gray-600">
              Duration: {formatDuration(calculateDurationFromForm(watchedValues))}
            </p>
          </div>
        )}

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

        {/* Error Display */}
        {submitError && (
          <div className="bg-red-50 border border-red-200 rounded-md p-3">
            <p className="text-sm text-red-600">{submitError}</p>
          </div>
        )}

        {/* Form Actions */}
        <div className="flex flex-col sm:flex-row sm:justify-end space-y-3 sm:space-y-0 sm:space-x-3 pt-4">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-colors"
              disabled={isLoading || isSubmitting}
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-colors"
            disabled={isLoading || isSubmitting}
          >
            {isSubmitting ? 'Saving...' : initialData ? 'Update Record' : 'Create Record'}
          </button>
        </div>
      </form>
    </div>
  );
};

// Helper functions
function formatTimeForInput(isoString: string): string {
  const date = new Date(isoString);
  // Handle timezone offset to get local time
  const localTime = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return localTime.toTimeString().slice(0, 5); // HH:MM format
}

function formatDateForInput(isoString: string): string {
  const date = new Date(isoString);
  return date.toISOString().split('T')[0]; // YYYY-MM-DD format
}

function calculateDurationFromForm(data: FormData): number {
  if (!data.startTime || !data.endTime || !data.date) return 0;
  
  const startDateTime = new Date(`${data.date}T${data.startTime}`);
  const endDateTime = new Date(`${data.date}T${data.endTime}`);
  
  return Math.round((endDateTime.getTime() - startDateTime.getTime()) / (1000 * 60));
}

function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} minutes`;
  }
  
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  
  if (remainingMinutes === 0) {
    return `${hours} hour${hours !== 1 ? 's' : ''}`;
  }
  
  return `${hours} hour${hours !== 1 ? 's' : ''} ${remainingMinutes} minute${remainingMinutes !== 1 ? 's' : ''}`;
}