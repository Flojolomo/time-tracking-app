import React, { useEffect, useState } from 'react';
import { TimeRecordList } from './TimeRecordList';
import { TimeRecordForm } from './TimeRecordForm';
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
  const [showForm, setShowForm] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);

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

  const handleFormSuccess = () => {
    setShowForm(false);
    setEditingRecord(null);
    // The TimeRecordList will automatically refresh due to React Query
  };

  const handleEditRecord = (record: any) => {
    setEditingRecord(record);
    setShowForm(true);
  };

  return (
    <div className={`space-y-4 sm:space-y-6 ${className}`}>
      {/* View Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Time Records</h1>
        <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
          <button
            onClick={() => setShowForm(!showForm)}
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
        <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">
            {editingRecord ? 'Edit Time Record' : 'Add New Time Record'}
          </h2>
          <TimeRecordForm
            initialData={editingRecord}
            onSuccess={handleFormSuccess}
            onCancel={() => {
              setShowForm(false);
              setEditingRecord(null);
            }}
          />
        </div>
      )}

      {/* Time Record List */}
      <TimeRecordList
        viewType={state.currentView}
        selectedDate={state.selectedDate}
        onDateChange={setDate}
        filters={mergedFilters}
        onEditRecord={handleEditRecord}
      />
    </div>
  );
};