import React, { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { CreateTimeRecordInput, UpdateTimeRecordInput, TimeRecord } from '../types';
import { calculateDuration } from '../utils/apiClient';
import { ProjectAutocomplete } from './ProjectAutocomplete';
import { TagAutocomplete } from './TagAutocomplete';
import { LoadingOverlay, ButtonLoading } from './LoadingSpinner';
import { ErrorMessage, ValidationError } from './ErrorMessage';
import { useNotifications } from '../contexts/NotificationContext';
import { useNetworkAwareOperation } from '../hooks/useNetworkStatus';
import { useFormAutoSave } from '../hooks/useOffline';

interface UnifiedTimeRecordFormProps {
  initialData?: TimeRecord;
  onSubmit: (data: CreateTimeRecordInput | UpdateTimeRecordInput) => Promise<void>;
  onCancel?: () => void;
  isLoading?: boolean;
  isActiveTimer?: boolean;
  onFieldUpdate?: (fieldName: string, value: string) => void;
}

interface FormData {
  projectName: string;
  startTime: string;
  endTime: string;
  date: string;
  description: string;
  tags: string;
}

export const UnifiedTimeRecordForm: React.FC<UnifiedTimeRecordFormProps> = ({
  initialData,
  onSubmit,
  onCancel,
  isLoading = false,
  isActiveTimer = false,
  onFieldUpdate
}) => {
  const [submitError, setSubmitError] = useState<string>('');
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const { showSuccess, showError } = useNotifications();
  const { executeWithRetry, isRetrying } = useNetworkAwareOperation();
  
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

  const watchedValues = watch();
  const formId = initialData ? `edit-record-${initialData.id}` : 'new-record';
  const { lastSaved, clearDraft } = useFormAutoSave(formId, watchedValues as unknown as Record<string, unknown>, !isActiveTimer);

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

  const validateForm = (data: FormData) => {
    const errors: Record<string, string> = {};

    if (!data.projectName.trim()) {
      errors.projectName = 'Project name is required';
    }

    if (!isActiveTimer) {
      if (!data.startTime) errors.startTime = 'Start time is required';
      if (!data.endTime) errors.endTime = 'End time is required';
      if (!data.date) errors.date = 'Date is required';

      if (data.startTime && data.endTime && data.date) {
        const startDateTime = new Date(`${data.date}T${data.startTime}`);
        const endDateTime = new Date(`${data.date}T${data.endTime}`);
        if (endDateTime <= startDateTime) {
          errors.endTime = 'End time must be after start time';
        }
      }
    }

    return errors;
  };

  const onFormSubmit = async (data: FormData) => {
    try {
      setSubmitError('');
      setValidationErrors([]);
      
      const validationErrors = validateForm(data);
      if (Object.keys(validationErrors).length > 0) {
        setValidationErrors(Object.values(validationErrors));
        return;
      }

      const tags = data.tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);
      
      let submissionData: any = {
        projectName: data.projectName.trim(),
        description: data.description.trim() || undefined,
        tags: tags.length > 0 ? tags : undefined
      };

      if (!isActiveTimer) {
        const startDateTime = new Date(`${data.date}T${data.startTime}`);
        const endDateTime = new Date(`${data.date}T${data.endTime}`);
        const duration = calculateDuration(startDateTime.toISOString(), endDateTime.toISOString());
        
        submissionData = {
          ...submissionData,
          startTime: startDateTime.toISOString(),
          endTime: endDateTime.toISOString(),
          duration
        };
      }

      await executeWithRetry(async () => {
        if (initialData) {
          await onSubmit({ id: initialData.id, ...submissionData } as UpdateTimeRecordInput);
        } else {
          await onSubmit(submissionData as CreateTimeRecordInput);
        }
      });

      showSuccess(
        initialData ? 'Time record updated' : 'Time record created',
        'Your time record has been saved successfully.'
      );

      clearDraft();
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to save time record';
      setSubmitError(errorMessage);
      showError('Save Failed', errorMessage);
    }
  };

  const handleFieldChange = (fieldName: string, value: string) => {
    if (isActiveTimer && onFieldUpdate) {
      onFieldUpdate(fieldName, value);
    }
  };

  return (
    <LoadingOverlay isLoading={isLoading} text="Loading form...">
      <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 max-w-2xl mx-auto">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4 sm:mb-6">
          {isActiveTimer ? 'Active Timer' : initialData ? 'Edit Time Record' : 'New Time Record'}
          {lastSaved && !isActiveTimer && (
            <div className="text-xs text-gray-500 font-normal mt-1">
              Auto-saved {lastSaved.toLocaleTimeString()}
            </div>
          )}
        </h2>

        <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-4 sm:space-y-6">
          {validationErrors.length > 0 && <ValidationError errors={validationErrors} />}

          <div>
            <label htmlFor="projectName" className="block text-sm font-medium text-gray-700 mb-2">
              Project Name *
            </label>
            <Controller
              name="projectName"
              control={control}
              rules={{ required: 'Project name is required' }}
              render={({ field }) => (
                <ProjectAutocomplete
                  id="projectName"
                  value={field.value}
                  onChange={(value) => {
                    field.onChange(value);
                    handleFieldChange('project', value);
                  }}
                  onBlur={field.onBlur}
                  placeholder="Enter project name"
                  disabled={isLoading || isSubmitting}
                  error={!!errors.projectName}
                />
              )}
            />
            {errors.projectName && <p className="mt-1 text-sm text-red-600">{errors.projectName.message}</p>}
          </div>

          {!isActiveTimer && (
            <>
              <div>
                <label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-2">Date *</label>
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
                {errors.date && <p className="mt-1 text-sm text-red-600">{errors.date.message}</p>}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="startTime" className="block text-sm font-medium text-gray-700 mb-2">Start Time *</label>
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
                  {errors.startTime && <p className="mt-1 text-sm text-red-600">{errors.startTime.message}</p>}
                </div>

                <div>
                  <label htmlFor="endTime" className="block text-sm font-medium text-gray-700 mb-2">End Time *</label>
                  <Controller
                    name="endTime"
                    control={control}
                    rules={{ required: 'End time is required' }}
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
                  {errors.endTime && <p className="mt-1 text-sm text-red-600">{errors.endTime.message}</p>}
                </div>
              </div>

              {watchedValues.startTime && watchedValues.endTime && watchedValues.date && (
                <div className="bg-gray-50 p-3 rounded-md">
                  <p className="text-sm text-gray-600">
                    Duration: {formatDuration(calculateDurationFromForm(watchedValues))}
                  </p>
                </div>
              )}
            </>
          )}

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">Comment</label>
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
                  onBlur={() => {
                    field.onBlur();
                    handleFieldChange('description', field.value);
                  }}
                />
              )}
            />
          </div>

          <div>
            <label htmlFor="tags" className="block text-sm font-medium text-gray-700 mb-2">Tags</label>
            <Controller
              name="tags"
              control={control}
              render={({ field }) => (
                <TagAutocomplete
                  id="tags"
                  value={field.value ? field.value.split(',').map((tag: string) => tag.trim()).filter(Boolean) : []}
                  onChange={(tags) => {
                    const tagsString = tags.join(', ');
                    field.onChange(tagsString);
                    handleFieldChange('tags', tagsString);
                  }}
                  onBlur={field.onBlur}
                  placeholder="Add tags"
                  disabled={isLoading || isSubmitting}
                />
              )}
            />
          </div>

          {submitError && <ErrorMessage error={submitError} onDismiss={() => setSubmitError('')} />}

          <div className="flex flex-col sm:flex-row sm:justify-end space-y-3 sm:space-y-0 sm:space-x-3 pt-4">
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-colors"
                disabled={isLoading || isSubmitting || isRetrying}
              >
                Cancel
              </button>
            )}
            {!isActiveTimer && (
              <button
                type="submit"
                className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-colors"
                disabled={isLoading || isSubmitting || isRetrying}
              >
                {(isSubmitting || isRetrying) ? (
                  <ButtonLoading text={isRetrying ? 'Retrying...' : 'Saving...'} />
                ) : (
                  initialData ? 'Update Record' : 'Create Record'
                )}
              </button>
            )}
          </div>
        </form>
      </div>
    </LoadingOverlay>
  );
};

// Helper functions
function formatTimeForInput(isoString: string): string {
  const date = new Date(isoString);
  return date.toTimeString().slice(0, 5);
}

function formatDateForInput(isoString: string): string {
  const date = new Date(isoString);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function calculateDurationFromForm(data: FormData): number {
  if (!data.startTime || !data.endTime || !data.date) return 0;
  
  const startDateTime = new Date(`${data.date}T${data.startTime}`);
  const endDateTime = new Date(`${data.date}T${data.endTime}`);
  
  return Math.round((endDateTime.getTime() - startDateTime.getTime()) / (1000 * 60));
}

function formatDuration(minutes: number): string {
  const roundedMinutes = Math.round(minutes);
  
  if (roundedMinutes < 60) {
    return `${roundedMinutes} minutes`;
  }
  
  const hours = Math.floor(roundedMinutes / 60);
  const remainingMinutes = roundedMinutes % 60;
  
  if (remainingMinutes === 0) {
    return `${hours} hour${hours !== 1 ? 's' : ''}`;
  }
  
  return `${hours} hour${hours !== 1 ? 's' : ''} ${remainingMinutes} minute${remainingMinutes !== 1 ? 's' : ''}`;
}