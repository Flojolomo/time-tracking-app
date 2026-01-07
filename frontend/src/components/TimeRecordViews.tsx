import React, { useState } from 'react';
import { TimeRecordList } from './TimeRecordList';
import { TimeRecordForm } from './TimeRecordForm';
import { ViewSelector } from './ViewSelector';
import { TimeRecordFilters, TimeRecord } from '../types';
import { useViewState } from '../contexts/ViewStateContext';
import { useViewRouting } from '../hooks/useViewRouting';
import { TimeRecordService } from '../utils/timeRecordService';

interface TimeRecordViewsProps {
  filters?: TimeRecordFilters;
  className?: string;
}

export const TimeRecordViews: React.FC<TimeRecordViewsProps> = ({
  filters,
  className = ''
}) => {
  const { state, setDate } = useViewState();
  const { navigateToView } = useViewRouting();
  const [showForm, setShowForm] = useState(false);
  const [editingRecord, setEditingRecord] = useState<TimeRecord | undefined>(undefined);

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

  const handleFormSuccess = () => {
    setShowForm(false);
    setEditingRecord(undefined);
    // The TimeRecordList will automatically refresh due to React Query
  };

  const handleFormSubmit = async (data: any) => {
    try {
      if (editingRecord) {
        // Update existing record - include the id in the data
        await TimeRecordService.updateTimeRecord({
          id: editingRecord.id,
          ...data
        });
      } else {
        // Create new record
        await TimeRecordService.createTimeRecord(data);
      }
      handleFormSuccess();
    } catch (error) {
      console.error('Error saving record:', error);
      // You might want to show a notification here
      throw error; // Re-throw to let the form handle the error
    }
  };

  const handleEditRecord = (record: TimeRecord) => {
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
            onClick={() => {
              if (showForm) {
                // Cancel - close form and clear editing state
                setShowForm(false);
                setEditingRecord(undefined);
              } else {
                // Add new record - clear editing state and show form
                setEditingRecord(undefined);
                setShowForm(true);
              }
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
        <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">
            {editingRecord ? 'Edit Time Record' : 'Add New Time Record'}
          </h2>
          <TimeRecordForm
            initialData={editingRecord}
            onSubmit={handleFormSubmit}
            onCancel={() => {
              setShowForm(false);
              setEditingRecord(undefined);
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