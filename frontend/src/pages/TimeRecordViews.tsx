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

  const [refreshKey, setRefreshKey] = useState(0);

  const handleFormSuccess = () => {
    // Refresh cached data after saving a record
    refreshData();
    // Force TimeRecordList to refresh
    setRefreshKey(prev => prev + 1);
  };

  const handleFormSubmit = async (data: any) => {
    try {
      await TimeRecordService.createTimeRecord(data);
      handleFormSuccess();
      setShowForm(false);
    } catch (error) {
      console.error('Error saving record:', error);
      throw error;
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
            backgroundStyle="bg-gradient-to-br from-gray-50 to-gray-100 border-2 border-gray-200"
            onSubmit={handleFormSubmit}
            onCancel={() => setShowForm(false)}
            title={
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4 sm:mb-6">
                {"New Time Record"}
              </h2>
            }
            actions={
              <div className="flex justify-end space-x-3 mt-4">
                <button
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
                >
                  Create
                </button>
              </div>
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
        key={refreshKey}
        viewType={state.currentView}
        selectedDate={state.selectedDate}
        onDateChange={setDate}
        filters={mergedFilters}
      />
    </div>
  );
};