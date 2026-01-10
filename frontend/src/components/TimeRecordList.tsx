import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { TimeRecord, TimeRecordFilters } from '../types';
import { TimeRecordService } from '../utils/timeRecordService';
import { useDataCache } from '../contexts/DataCacheContext';
import { TimeRecordForm } from './TimeRecordForm';

// View types for different time periods
export type ViewType = 'daily' | 'weekly' | 'monthly';

// Date navigation utilities
const formatDate = (date: Date): string => {
  return date.toISOString().split('T')[0];
};

const formatDisplayDate = (date: Date): string => {
  return date.toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
};

const formatDisplayWeek = (startDate: Date, endDate: Date): string => {
  const start = startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const end = endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  return `${start} - ${end}`;
};

const formatDisplayMonth = (date: Date): string => {
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
};

const getWeekStart = (date: Date): Date => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day;
  return new Date(d.setDate(diff));
};

const getWeekEnd = (date: Date): Date => {
  const weekStart = getWeekStart(date);
  return new Date(weekStart.getTime() + 6 * 24 * 60 * 60 * 1000);
};

const getMonthStart = (date: Date): Date => {
  return new Date(date.getFullYear(), date.getMonth(), 1);
};

const getMonthEnd = (date: Date): Date => {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
};

// Calculate total duration for a list of records
const calculateTotalDuration = (records: TimeRecord[]): number => {
  return records.reduce((total, record) => total + (record.duration || 0), 0);
};

// Format duration in minutes to hours and minutes
const formatDuration = (minutes: number): string => {
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  if (hours === 0) return `${mins}m`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
};

// Helper to compute date range
const computeDateRange = (viewType: ViewType, selectedDate: Date) => {
  switch (viewType) {
    case 'daily': {
      return {
        start: formatDate(selectedDate),
        end: formatDate(selectedDate)
      };
    }
    case 'weekly': {
      const weekStart = getWeekStart(selectedDate);
      const weekEnd = getWeekEnd(selectedDate);
      return {
        start: formatDate(weekStart),
        end: formatDate(weekEnd)
      };
    }
    case 'monthly': {
      const monthStart = getMonthStart(selectedDate);
      const monthEnd = getMonthEnd(selectedDate);
      return {
        start: formatDate(monthStart),
        end: formatDate(monthEnd)
      };
    }
    default: {
      return {
        start: formatDate(selectedDate),
        end: formatDate(selectedDate)
      };
    }
  }
};

interface TimeRecordListProps {
  viewType: ViewType;
  selectedDate: Date;
  onDateChange: (date: Date) => void;
  filters?: TimeRecordFilters;
}

export const TimeRecordList: React.FC<TimeRecordListProps> = ({
  viewType,
  selectedDate,
  onDateChange,
  filters,
}) => {
  const [records, setRecords] = useState<TimeRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { refreshData } = useDataCache();
  
  // Track last fetched params to prevent duplicate requests
  const lastFetchedRef = useRef<string>('');

  // Compute date range as strings (stable values)
  const dateRange = computeDateRange(viewType, selectedDate);

  // Create a stable fetch key from all dependencies
  const fetchKey = useMemo(() => {
    return JSON.stringify({
      start: dateRange.start,
      end: dateRange.end,
      projectName: filters?.projectName,
      tags: filters?.tags
    });
  }, [dateRange.start, dateRange.end, filters?.projectName, filters?.tags]);

  // Load records function
  const loadRecords = useCallback(async () => {
    // Skip if we already fetched with these params
    if (lastFetchedRef.current === fetchKey) {
      return;
    }
    
    lastFetchedRef.current = fetchKey;
    setLoading(true);
    setError(null);
    
    try {
      const fetchFilters: TimeRecordFilters = {
        startDate: dateRange.start,
        endDate: dateRange.end,
        ...filters
      };
      
      const fetchedRecords = await TimeRecordService.getTimeRecords(fetchFilters);
      setRecords(fetchedRecords);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch time records');
    } finally {
      setLoading(false);
    }
  }, [fetchKey, dateRange.start, dateRange.end, filters]);

  // Handle delete record
  const handleDeleteRecord = async (record: TimeRecord) => {
    if (!window.confirm('Are you sure you want to delete this time record?')) {
      return;
    }

    try {
      await TimeRecordService.deleteTimeRecord(record.id);
      // Reset the fetch key to force a refresh
      lastFetchedRef.current = '';
      await loadRecords();
      // Refresh cached data after deleting a record
      refreshData();
    } catch (error) {
      console.error('Error deleting record:', error);
    }
  };

  // Fetch records when fetch key changes
  useEffect(() => {
    loadRecords();
  }, [loadRecords]);

  // Group records based on view type
  const groupedRecords = useMemo(() => {
    switch (viewType) {
      case 'daily': {
        return { [formatDate(selectedDate)]: records };
      }
      
      case 'weekly': {
        const weeklyGroups: Record<string, TimeRecord[]> = {};
        records.forEach(record => {
          const recordDate = formatDate(new Date(record.startTime));
          if (!weeklyGroups[recordDate]) {
            weeklyGroups[recordDate] = [];
          }
          weeklyGroups[recordDate].push(record);
        });
        return weeklyGroups;
      }
      
      case 'monthly': {
        const monthlyGroups: Record<string, TimeRecord[]> = {};
        records.forEach(record => {
          const recordDate = formatDate(new Date(record.startTime));
          if (!monthlyGroups[recordDate]) {
            monthlyGroups[recordDate] = [];
          }
          monthlyGroups[recordDate].push(record);
        });
        return monthlyGroups;
      }
      
      default:
        return {};
    }
  }, [records, viewType, selectedDate]);

  // Navigation handlers
  const navigatePrevious = () => {
    const newDate = new Date(selectedDate);
    switch (viewType) {
      case 'daily': {
        newDate.setDate(newDate.getDate() - 1);
        break;
      }
      case 'weekly': {
        newDate.setDate(newDate.getDate() - 7);
        break;
      }
      case 'monthly': {
        newDate.setMonth(newDate.getMonth() - 1);
        break;
      }
    }
    onDateChange(newDate);
  };

  const navigateNext = () => {
    const newDate = new Date(selectedDate);
    switch (viewType) {
      case 'daily': {
        newDate.setDate(newDate.getDate() + 1);
        break;
      }
      case 'weekly': {
        newDate.setDate(newDate.getDate() + 7);
        break;
      }
      case 'monthly': {
        newDate.setMonth(newDate.getMonth() + 1);
        break;
      }
    }
    onDateChange(newDate);
  };

  const navigateToday = () => {
    onDateChange(new Date());
  };

  // Get display title based on view type
  const getDisplayTitle = (): string => {
    switch (viewType) {
      case 'daily': {
        return formatDisplayDate(selectedDate);
      }
      case 'weekly': {
        const weekStart = getWeekStart(selectedDate);
        const weekEnd = getWeekEnd(selectedDate);
        return formatDisplayWeek(weekStart, weekEnd);
      }
      case 'monthly': {
        return formatDisplayMonth(selectedDate);
      }
      default: {
        return '';
      }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        <span className="ml-2 text-gray-600">Loading time records...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">Error loading time records</h3>
            <p className="mt-1 text-sm text-red-700">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  const totalDuration = calculateTotalDuration(records);

  return (
    <div className="space-y-6">
      {/* Navigation Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
        <div className="flex items-center justify-center sm:justify-start space-x-2 sm:space-x-4">
          <button
            onClick={navigatePrevious}
            className="p-2 rounded-md border border-gray-300 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
            aria-label="Previous period"
          >
            <svg className="h-5 w-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900 text-center sm:text-left min-w-0 flex-1 sm:flex-none">
            {getDisplayTitle()}
          </h2>
          
          <button
            onClick={navigateNext}
            className="p-2 rounded-md border border-gray-300 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
            aria-label="Next period"
          >
            <svg className="h-5 w-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
        
        <div className="flex items-center justify-center sm:justify-end space-x-3">
          <button
            onClick={navigateToday}
            className="px-3 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 rounded-md hover:bg-indigo-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
          >
            Today
          </button>
          
          {totalDuration > 0 && (
            <div className="text-sm text-gray-600">
              Total: <span className="font-medium">{formatDuration(totalDuration)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Records Display */}
      {Object.keys(groupedRecords).length === 0 ? (
        <div className="text-center py-12">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No time records</h3>
          <p className="mt-1 text-sm text-gray-500">
            No time records found for the selected {viewType} period.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedRecords)
            .sort(([a], [b]) => b.localeCompare(a)) // Sort dates descending
            .map(([date, dayRecords]) => (
              <DayGroup
                key={date}
                date={date}
                records={dayRecords}
                showDate={viewType !== 'daily'}
                onDeleteRecord={handleDeleteRecord}
              />
            ))}
        </div>
      )}
    </div>
  );
};

// Component for displaying records grouped by day
interface DayGroupProps {
  date: string;
  records: TimeRecord[];
  showDate: boolean;
  onDeleteRecord?: (record: TimeRecord) => void;
}

const DayGroup: React.FC<DayGroupProps> = ({ date, records, showDate, onDeleteRecord}) => {
  const dayTotal = calculateTotalDuration(records);
  const displayDate = new Date(date + 'T00:00:00');

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      {showDate && (
        <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200 bg-gray-50 rounded-t-lg">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-1 sm:space-y-0">
            <h3 className="text-base sm:text-lg font-medium text-gray-900">
              {displayDate.toLocaleDateString('en-US', { 
                weekday: 'long', 
                month: 'long', 
                day: 'numeric' 
              })}
            </h3>
            {dayTotal > 0 && (
              <span className="text-sm font-medium text-gray-600">
                {formatDuration(dayTotal)}
              </span>
            )}
          </div>
        </div>
      )}
      
      <div className="divide-y divide-gray-200">
        {records
          .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())
          .map((record) => (
            <TimeRecordItem 
              key={record.id} 
              record={record} 
              onDelete={onDeleteRecord}
            />
          ))}
      </div>
    </div>
  );
};

// Component for individual time record display
interface TimeRecordItemProps {
  record: TimeRecord;
  onEdit?: (record: TimeRecord) => void;
  onDelete?: (record: TimeRecord) => void;
}

const TimeRecordItem: React.FC<TimeRecordItemProps> = ({ record, onDelete }) => {
  const startTime = new Date(record.startTime);
  const endTime = record.endTime ? new Date(record.endTime) : null;

    const [isEditing, setIsEditing] = useState<boolean>(false);
  
  
  const formatTime = (date: Date): string => {
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  };

  const handleEditRecord = (isEditing: boolean) => {
    console.log("Is Editing", isEditing)
    setIsEditing(!isEditing);
  };

  return (
    <div className="px-4 sm:px-6 py-4 hover:bg-gray-50 transition-colors">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between space-y-3 sm:space-y-0">
        <div className="flex-1 min-w-0">
          <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-3">
            <h4 className="text-sm font-medium text-gray-900 truncate">
              {record.projectName}
            </h4>
            
            {record.tags && record.tags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {record.tags.map((tag, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
          
          {record.description && (
            <p className="mt-1 text-sm text-gray-600 line-clamp-2 sm:truncate">
              {record.description}
            </p>
          )}
          
          <div className="mt-2 flex flex-col sm:flex-row sm:items-center text-xs text-gray-500 space-y-1 sm:space-y-0 sm:space-x-4">
            <span>
              {formatTime(startTime)}
              {endTime && ` - ${formatTime(endTime)}`}
            </span>
            
            {record.duration && (
              <span className="font-medium">
                {formatDuration(record.duration)}
              </span>
            )}
          </div>
        </div>
        
        <div className="flex items-center justify-end space-x-2 ml-0 sm:ml-4">
          <button
            onClick={() => handleEditRecord(isEditing)}
            className="p-2 text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 rounded transition-colors"
            title="Edit record"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
          
          <button
            onClick={() => onDelete?.(record)}
            className="p-2 text-gray-400 hover:text-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 rounded transition-colors"
            title="Delete record"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>
      
        { isEditing ? (
            <TimeRecordForm
              initialData={record}
              backgroundStyle="bg-gradient-to-br from-gray-50 to-gray-100 border-2 border-gray-200"
              onSubmit={async (data) => {
                await TimeRecordService.updateTimeRecord({ id: record.id, ...data });
                setIsEditing(false);
                window.location.reload();
              }}
              onCancel={() => setIsEditing(false)}
              title={
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4 sm:mb-6">
                  {"Edit Time Record"}
                </h2>
              }
              actions={
                <div className="flex justify-end space-x-3 mt-4">
                  <button
                    onClick={() => setIsEditing(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
                  >
                    Save
                  </button>
                </div>
              }
            />
        ) : (null) }
      </div>
  );
};