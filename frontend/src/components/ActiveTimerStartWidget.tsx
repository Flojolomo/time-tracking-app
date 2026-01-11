import React, { useState } from 'react';
import { TimeRecordService } from '../utils/timeRecordService';
import { ButtonLoading } from './LoadingSpinner';
import { useNotifications } from '../contexts/NotificationContext';
import { useNetworkAwareOperation } from '../hooks/useNetworkStatus';

interface ActiveTimerStartWidgetProps {
  onRecordChange: () => void;
}

export const ActiveTimerStartWidget: React.FC<ActiveTimerStartWidgetProps> = ({ onRecordChange }) => {
  const [isLoading, setIsLoading] = useState(false);
  const { showSuccess, showError } = useNotifications();
  const { executeWithRetry, isRetrying } = useNetworkAwareOperation();

  const handleStartTimer = async () => {
    try {
      setIsLoading(true);

      await executeWithRetry(async () => {
        await TimeRecordService.startTimer();
        onRecordChange();
      });

      showSuccess('Timer Started', 'Your time tracking has begun!');
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to start timer';
      showError('Start Failed', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
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
  );
};