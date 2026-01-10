/**
 * Statistics Dashboard Component
 * Main dashboard showing time tracking analytics and visualizations
 */

import React, { useState, useEffect, useCallback } from 'react';
import { TimeRecordService, StatisticsService } from '../utils';
import type { 
  TimeRecord, 
  ProjectStatistics, 
  TagStatistics, 
  TimeStatistics,
  DailyStatistics 
} from '../types';
import { ProjectChart, TimelineChart, MetricsCards } from '../components';

interface StatsDashboardProps {
  className?: string;
}

export const StatsDashboard: React.FC<StatsDashboardProps> = ({ className = '' }) => {
  const [timeRecords, setTimeRecords] = useState<TimeRecord[]>([]);
  const [projectStats, setProjectStats] = useState<ProjectStatistics[]>([]);
  const [tagStats, setTagStats] = useState<TagStatistics[]>([]);
  const [timeStats, setTimeStats] = useState<TimeStatistics | null>(null);
  const [dailyStats, setDailyStats] = useState<DailyStatistics[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<'week' | 'month' | 'quarter'>('month');

  // Calculate date range for filtering
  const getDateRange = (range: 'week' | 'month' | 'quarter') => {
    const now = new Date();
    const endDate = now.toISOString().split('T')[0];
    let startDate: string;

    switch (range) {
      case 'week': {
        const weekAgo = new Date(now);
        weekAgo.setDate(weekAgo.getDate() - 7);
        startDate = weekAgo.toISOString().split('T')[0];
        break;
      }
      case 'month': {
        const monthAgo = new Date(now);
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        startDate = monthAgo.toISOString().split('T')[0];
        break;
      }
      case 'quarter': {
        const quarterAgo = new Date(now);
        quarterAgo.setMonth(quarterAgo.getMonth() - 3);
        startDate = quarterAgo.toISOString().split('T')[0];
        break;
      }
      default:
        startDate = endDate;
    }

    return { startDate, endDate };
  };

  // Load and calculate statistics
  const loadStatistics = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const { startDate, endDate } = getDateRange(dateRange);
      
      // Fetch time records for the selected date range
      const records = await TimeRecordService.getTimeRecords({
        startDate,
        endDate
      });

      setTimeRecords(records);

      // Calculate various statistics
      const projectStatistics = StatisticsService.calculateProjectStatistics(records);
      const tagStatistics = StatisticsService.calculateTagStatistics(records);
      const timeStatistics = StatisticsService.calculateTimeStatistics(records);
      const dailyStatistics = StatisticsService.calculateDailyStatistics(records);

      setProjectStats(projectStatistics);
      setTagStats(tagStatistics);
      setTimeStats(timeStatistics);
      setDailyStats(dailyStatistics);

    } catch (err) {
      console.error('Failed to load statistics:', err);
      setError(err instanceof Error ? err.message : 'Failed to load statistics');
    } finally {
      setIsLoading(false);
    }
  }, [dateRange]);

  // Load statistics when component mounts or date range changes
  useEffect(() => {
    loadStatistics();
  }, [dateRange, loadStatistics]);

  // Handle date range change
  const handleDateRangeChange = (newRange: 'week' | 'month' | 'quarter') => {
    setDateRange(newRange);
  };

  if (isLoading) {
    return (
      <div className={`flex items-center justify-center p-8 ${className}`}>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Loading statistics...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-red-50 border border-red-200 rounded-md p-4 ${className}`}>
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">Error loading statistics</h3>
            <p className="mt-1 text-sm text-red-700">{error}</p>
            <button
              onClick={loadStatistics}
              className="mt-2 text-sm text-red-800 underline hover:text-red-900"
            >
              Try again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-4 sm:space-y-6 ${className}`}>
      {/* Header with date range selector */}
      <div className="flex flex-col space-y-4 sm:space-y-0 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Analytics Dashboard</h2>
          <p className="mt-1 text-sm text-gray-500">
            Insights into your time tracking patterns and productivity
          </p>
        </div>
        
        <div className="flex justify-center sm:justify-end">
          <div className="flex rounded-md shadow-sm">
            {(['week', 'month', 'quarter'] as const).map((range) => (
              <button
                key={range}
                onClick={() => handleDateRangeChange(range)}
                className={`px-3 sm:px-4 py-2 text-sm font-medium border ${
                  dateRange === range
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                } ${
                  range === 'week' ? 'rounded-l-md' : range === 'quarter' ? 'rounded-r-md' : ''
                } ${range !== 'week' ? '-ml-px' : ''} transition-colors`}
              >
                {range.charAt(0).toUpperCase() + range.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Show message if no data */}
      {timeRecords.length === 0 ? (
        <div className="text-center py-12">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No data available</h3>
          <p className="mt-1 text-sm text-gray-500">
            Start tracking time to see your analytics and insights here.
          </p>
        </div>
      ) : (
        <>
          {/* Key Metrics Cards */}
          {timeStats && (
            <MetricsCards 
              timeStats={timeStats}
              projectCount={projectStats.length}
              dateRange={dateRange}
            />
          )}

          {/* Charts Grid */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6">
            {/* Project Distribution Chart */}
            {projectStats.length > 0 && (
              <div className="bg-white p-4 sm:p-6 rounded-lg shadow">
                <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-4">Time by Project</h3>
                <ProjectChart 
                  projectStats={projectStats}
                  type="pie"
                />
              </div>
            )}

            {/* Tag Distribution Chart */}
            {tagStats.length > 0 && (
              <div className="bg-white p-4 sm:p-6 rounded-lg shadow">
                <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-4">Time by Tags</h3>
                <ProjectChart 
                  projectStats={tagStats.map(tag => ({
                    projectName: tag.tagName,
                    totalDuration: tag.totalDuration,
                    recordCount: tag.recordCount,
                    averageDuration: tag.totalDuration / tag.recordCount,
                    percentage: tag.percentage
                  }))}
                  type="doughnut"
                />
              </div>
            )}
          </div>

          {/* Timeline Chart */}
          {dailyStats.length > 0 && (
            <div className="bg-white p-4 sm:p-6 rounded-lg shadow">
              <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-4">Daily Time Tracking</h3>
              <TimelineChart 
                dailyStats={dailyStats}
                dateRange={dateRange}
              />
            </div>
          )}

          {/* Project Details Table */}
          {projectStats.length > 0 && (
            <div className="bg-white shadow rounded-lg">
              <div className="px-4 sm:px-6 py-4 border-b border-gray-200">
                <h3 className="text-base sm:text-lg font-medium text-gray-900">Project Breakdown</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Project
                      </th>
                      <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Total Time
                      </th>
                      <th className="hidden sm:table-cell px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Sessions
                      </th>
                      <th className="hidden md:table-cell px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Avg Session
                      </th>
                      <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Percentage
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {projectStats.map((project, index) => (
                      <tr key={project.projectName} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          <div className="truncate max-w-32 sm:max-w-none">{project.projectName}</div>
                        </td>
                        <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {StatisticsService.formatDuration(project.totalDuration)}
                        </td>
                        <td className="hidden sm:table-cell px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {project.recordCount}
                        </td>
                        <td className="hidden md:table-cell px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {StatisticsService.formatDuration(project.averageDuration)}
                        </td>
                        <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {StatisticsService.formatPercentage(project.percentage)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};