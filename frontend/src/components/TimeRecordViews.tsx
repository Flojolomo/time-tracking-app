import React, { useEffect } from 'react';
import { TimeRecordList } from './TimeRecordList';
import { ViewSelector } from './ViewSelector';
import { TimeRecordFilters } from '../types';
import { useViewState } from '../contexts/ViewStateContext';
import { useViewRouting } from '../hooks/useViewRouting';

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

  // Update context filters when props change
  useEffect(() => {
    if (filters) {
      setFilters({ ...state.filters, ...filters });
    }
  }, [filters, setFilters, state.filters]);

  // Merge context filters with prop filters
  const mergedFilters: TimeRecordFilters = {
    ...state.filters,
    ...filters
  };

  return (
    <div className={`space-y-4 sm:space-y-6 ${className}`}>
      {/* View Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Time Records</h1>
        <ViewSelector
          currentView={state.currentView}
          onViewChange={navigateToView}
        />
      </div>

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