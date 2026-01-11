import React, { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { CreateTimeRecordInput, UpdateTimeRecordInput, TimeRecord } from '../types';
import { calculateDuration } from '../utils/apiClient';
import { ProjectAutocomplete } from './ProjectAutocomplete';
import { TagAutocomplete } from './TagAutocomplete';
import { LoadingOverlay } from './LoadingSpinner';
import { ErrorMessage, ValidationError } from './ErrorMessage';
import { useNotifications } from '../contexts/NotificationContext';
import { useNetworkAwareOperation } from '../hooks/useNetworkStatus';
import { useFormAutoSave } from '../hooks/useOffline';

interface TimeRecordFormProps {
  initialData?: TimeRecord;
  onSubmit: (data: CreateTimeRecordInput | UpdateTimeRecordInput) => Promise<void>;
  onCancel?: () => void;
  isLoading?: boolean;
  title?: React.ReactNode;
  onFieldUpdate?: (fieldName: string, value: string) => void;
  actions?: React.ReactNode;
  backgroundStyle?: string;
}

export interface TimeRecordFormRef {
  submit: () => void;
}

interface FormData {
  projectName: string;
  startTime: string;
  endTime: string;
  date: string;
  description: string;
  tags: string;
}

export const TimeRecordForm = forwardRef<TimeRecordFormRef, TimeRecordFormProps>((
  {
    initialData,
    onSubmit,
    onFieldUpdate,
    isLoading = false,
    title,
    actions,
    backgroundStyle = 'bg-gradient-to-br from-gray-50 to-gray-100 border-2 border-gray-200'
  },
  ref
) => {
  const [submitError, setSubmitError] = useState<string>('');
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const { showSuccess, showError } = useNotifications();
  const { executeWithRetry } = useNetworkAwareOperation();

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

  // Auto-save form data
  const formId = initialData ? `edit-record-${initialData.id}` : 'new-record';
  const { clearDraft } = useFormAutoSave(formId, watchedValues as unknown as Record<string, unknown>, true);

  // Expose submit method to parent
  useImperativeHandle(ref, () => ({
    submit: () => handleSubmit(onFormSubmit)()
  }));

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
    console.log("Form submitted")
    try {
      setSubmitError('');
      setValidationErrors([]);

      // Validate form data
      const validationErrors = validateForm(data);
      if (Object.keys(validationErrors).length > 0) {
        setValidationErrors(Object.values(validationErrors));
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

      // Execute with retry logic
      await executeWithRetry(async () => {
        if (initialData) {
          await onSubmit({
            id: initialData.id,
            ...submissionData
          } as UpdateTimeRecordInput);
        } else {
          await onSubmit(submissionData as CreateTimeRecordInput);
        }
      });

      // Show success message
      showSuccess(
        initialData ? 'Time record updated' : 'Time record created',
        'Your time record has been saved successfully.'
      );

      // Clear auto-saved draft
      clearDraft();

    } catch (error: any) {
      const errorMessage = error.message || 'Failed to save time record';
      setSubmitError(errorMessage);
      showError('Save Failed', errorMessage);
    }
  };

  return (

    <LoadingOverlay isLoading={isLoading} text="Loading form...">
      <div className={`${backgroundStyle} rounded-xl p-4 mt-4`} >
        <div className="space-y-4 sm:space-y-6">
          {title && (
            <div className="mb-4 sm:mb-6">
              {title}
            </div>
          )}

          <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-4 sm:space-y-6">
            {/* Validation Errors */}
            {validationErrors.length > 0 && (
              <ValidationError errors={validationErrors} />
            )}

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
                    onChange={(value) => {
                      field.onChange(value);
                      onFieldUpdate?.('project', value);
                    }}
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
                    className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base ${errors.date ? 'border-red-500' : 'border-gray-300'
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
                      className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base ${errors.startTime ? 'border-red-500' : 'border-gray-300'
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
                      className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base ${errors.endTime ? 'border-red-500' : 'border-gray-300'
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
                    onChange={(e) => {
                      field.onChange(e);
                      onFieldUpdate?.('description', e.target.value);
                    }}
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
                  <TagAutocomplete
                    id="tags"
                    value={field.value ? field.value.split(',').map((tag: string) => tag.trim()).filter(Boolean) : []}
                    onChange={(tags) => {
                      const tagString = tags.join(', ');
                      field.onChange(tagString);
                      onFieldUpdate?.('tags', tagString);
                    }}
                    onBlur={field.onBlur}
                    placeholder="Add tags"
                    disabled={isLoading || isSubmitting}
                    error={false}
                    className=""
                  />
                )}
              />
            </div>

            {/* Error Display */}
            {submitError && (
              <ErrorMessage
                error={submitError}
                onDismiss={() => setSubmitError('')}
              />
            )}

            {actions}
          </form>
        </div>
      </div>
    </LoadingOverlay>
  );
});

// Helper functions
function formatTimeForInput(isoString: string): string {
  const date = new Date(isoString);
  return date.toTimeString().slice(0, 5); // HH:MM format in local time
}

function formatDateForInput(isoString: string): string {
  const date = new Date(isoString);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`; // YYYY-MM-DD format in local time
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