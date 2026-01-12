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
import { LandingPage } from './LandingPage';
import { DataCacheProvider } from '../contexts/DataCacheContext';
import { Button, ButtonGroup, ErrorAlert, LoadingSpinner, PageHeader, EmptyState, Section } from '../components/ui';

const AnalyticsContent: React.FC = () => {
  const [timeRecords, setTimeRecords] = useState<TimeRecord[]>([]);
  const [projectStats, setProjectStats] = useState<ProjectStatistics[]>([]);
  const [tagStats, setTagStats] = useState<TagStatistics[]>([]);
  const [timeStats, setTimeStats] = useState<TimeStatistics | null>(null);
  const [dailyStats, setDailyStats] = useState<DailyStatistics[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<'day' | 'week' | 'month' | 'quarter'>('month');

  // Calculate date range for filtering
  const getDateRange = (range: 'day' | 'week' | 'month' | 'quarter') => {
    const now = new Date();
    const endDate = now.toISOString().split('T')[0];
    let startDate: string;

    switch (range) {
      case 'day': {
        startDate = endDate;
        break;
      }
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

    } catch (err: unknown) {
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
  const handleDateRangeChange = (newRange: 'day' | 'week' | 'month' | 'quarter') => {
    setDateRange(newRange);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <LoadingSpinner />
        <span className="ml-2 text-gray-600">Loading statistics...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <ErrorAlert message={error} />
        <div className="text-center">
          <Button onClick={loadStatistics} variant="secondary">
            Try again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <PageHeader
        title="Analytics Dashboard"
        description="Insights into your time tracking patterns and productivity"
        actions={
          <ButtonGroup
            options={[
              { value: 'day', label: 'Day' },
              { value: 'week', label: 'Week' },
              { value: 'month', label: 'Month' },
              { value: 'quarter', label: 'Quarter' }
            ]}
            value={dateRange}
            onChange={(value) => handleDateRangeChange(value as 'day' | 'week' | 'month' | 'quarter')}
          />
        }
      />

      {timeRecords.length === 0 ? (
        <EmptyState
          icon={
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          }
          title="No data available"
          description="Start tracking time to see your analytics and insights here."
        />
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

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6">
            {projectStats.length > 0 && (
              <Section title="Time by Project">
                <ProjectChart 
                  projectStats={projectStats}
                  type="pie"
                />
              </Section>
            )}

            {tagStats.length > 0 && (
              <Section title="Time by Tags">
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
              </Section>
            )}
          </div>

          {dailyStats.length > 0 && dateRange !== 'day' && (
            <Section title="Daily Time Tracking">
              <TimelineChart 
                dailyStats={dailyStats}
                dateRange={dateRange}
              />
            </Section>
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

export const AnalyticsPage: React.FC = () => {
  return (
    <LandingPage>
      <DataCacheProvider>
        <AnalyticsContent />
      </DataCacheProvider>
    </LandingPage>
  );
};