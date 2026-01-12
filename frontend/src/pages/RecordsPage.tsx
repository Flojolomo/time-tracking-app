import React, { useState } from 'react';
import { TimeRecordList } from '../components/TimeRecordList';
import { TimeRecordForm } from '../components/TimeRecordForm';
import { ViewSelector } from '../components/ViewSelector';
import { RecordFilters } from '../components/RecordFilters';
import { TimeRecordFilters } from '../types';
import { useViewState } from '../contexts/ViewStateContext';
import { useDataCache } from '../contexts/DataCacheContext';
import { TimeRecordService } from '../utils/timeRecordService';
import { LandingPage } from './LandingPage';
import { DataCacheProvider } from '../contexts/DataCacheContext';
import { ViewStateProvider } from '../contexts/ViewStateContext';
import { ViewType } from '../components/TimeRecordList';
import { Button, PageHeader } from '../components/ui';

const RecordsContent: React.FC = () => {
  const { state, setDate, setFilters, setView } = useViewState();
  const { refreshData } = useDataCache();
  const [showForm, setShowForm] = useState(false);

  // Set date to today on mount
  React.useEffect(() => {
    setDate(new Date());
  }, [setDate]);

  // Simple view change handler (no routing needed)
  const handleViewChange = (view: ViewType) => {
    setView(view);
    // When switching to daily view, always show today
    if (view === 'daily') {
      setDate(new Date());
    }
  };

  // Merge context filters with prop filters (memoized to prevent unnecessary re-renders)
  const mergedFilters: TimeRecordFilters = React.useMemo(() => ({
    ...state.filters
  }), [
    state.filters.projectName,
    state.filters.startDate, 
    state.filters.endDate,
    state.filters.tags?.join(',')
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
    <div className="space-y-4 sm:space-y-6">
      <PageHeader
        title="Time Records"
        actions={
          <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
            <Button onClick={() => setShowForm(!showForm)}>
              {showForm ? 'Cancel' : 'Add Time Record'}
            </Button>
            <ViewSelector
              currentView={state.currentView}
              onViewChange={handleViewChange}
            />
          </div>
        }
      />

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
                <Button
                  variant="secondary"
                  onClick={() => setShowForm(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                >
                  Create
                </Button>
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

export const RecordsPage: React.FC = () => {
  return (
    <LandingPage>
      <DataCacheProvider>
        <ViewStateProvider>
          <RecordsContent />
        </ViewStateProvider>
      </DataCacheProvider>
    </LandingPage>
  );
};