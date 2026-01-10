import React, { useState } from 'react';
import { TimeRecordList } from '../components/TimeRecordList';
import { TimeRecordForm } from '../components/TimeRecordForm';
import { ViewSelector } from '../components/ViewSelector';
import { RecordFilters } from '../components/RecordFilters';
import { TimeRecordFilters } from '../types';
import { useViewState } from '../contexts/ViewStateContext';
import { useViewRouting } from '../hooks/useViewRouting';
import { useDataCache } from '../contexts/DataCacheContext';
import { TimeRecordService } from '../utils/timeRecordService';

interface TimeRecordViewsProps {
  filters?: TimeRecordFilters;
  className?: string;
}

export const TimeRecordViews: React.FC<TimeRecordViewsProps> = ({
  filters,
  className = ''
}) => {
  const { state, setDate, setFilters } = useViewState();
  const { navigateToView } = useViewRouting();
  const { refreshData } = useDataCache();
  const [showForm, setShowForm] = useState(false);

  // Merge context filters with prop filters (memoized to prevent unnecessary re-renders)
  const mergedFilters: TimeRecordFilters = React.useMemo(() => ({
    ...state.filters,
    ...filters
  }), [
    state.filters.projectName,
    state.filters.startDate, 
    state.filters.endDate,
    state.filters.tags?.join(','),
    filters?.projectName,
    filters?.startDate,
    filters?.endDate,
    filters?.tags?.join(',')
  ]);

  // Handle filter changes
  const handleFiltersChange = (newFilters: TimeRecordFilters) => {
    setFilters(newFilters);
  };

  const handleFormSuccess = () => {
    // Refresh cached data after saving a record
    refreshData();
    // The TimeRecordList will automatically refresh due to React Query
  };

  const handleFormSubmit = async (data: any) => {
    try {
      await TimeRecordService.createTimeRecord(data);
      handleFormSuccess();
    } catch (error) {
      console.error('Error saving record:', error);
      // You might want to show a notification here
      throw error; // Re-throw to let the form handle the error
    }
  };

  return (
    <div className={`space-y-4 sm:space-y-6 ${className}`}>
      {/* View Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Time Records</h1>
        <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
          <button
            onClick={() => {
              setShowForm(!showForm);
            }}
            className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
          >
            {showForm ? 'Cancel' : 'Add Time Record'}
          </button>
          <ViewSelector
            currentView={state.currentView}
            onViewChange={navigateToView}
          />
        </div>
      </div>

      {/* Time Record Form */}
      {showForm && (
        <TimeRecordForm
            onSubmit={handleFormSubmit}
            onCancel={() => setShowForm(false)}
            title={
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4 sm:mb-6">
                {"New Time Record"}
              </h2>
            }
          />
      )}

      {/* Filters */}
      <RecordFilters
        filters={mergedFilters}
        onFiltersChange={handleFiltersChange}
      />

      {/* Time Record List */}
      <TimeRecordList
        viewType={state.currentView}
        selectedDate={state.selectedDate}
        onDateChange={setDate}
        filters={mergedFilters}
      />
    </div>
  );
};