/**
 * Metrics Cards Component
 * Displays key performance indicators and statistics in card format
 */

import React from 'react';
import type { TimeStatistics } from '../types';
import { StatisticsService } from '../utils';

interface MetricsCardsProps {
  timeStats: TimeStatistics;
  projectCount: number;
  dateRange: 'week' | 'month' | 'quarter';
  className?: string;
}

export const MetricsCards: React.FC<MetricsCardsProps> = ({
  timeStats,
  projectCount,
  dateRange,
  className = ''
}) => {
  // Format date range for display
  const formatDateRangeLabel = (range: 'week' | 'month' | 'quarter') => {
    switch (range) {
      case 'week':
        return 'This Week';
      case 'month':
        return 'This Month';
      case 'quarter':
        return 'Last 3 Months';
      default:
        return 'Period';
    }
  };

  const metrics = [
    {
      title: 'Total Time',
      value: StatisticsService.formatDuration(timeStats.totalDuration),
      subtitle: formatDateRangeLabel(dateRange),
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      color: 'bg-blue-500',
      bgColor: 'bg-blue-50',
      textColor: 'text-blue-600',
    },
    {
      title: 'Daily Average',
      value: StatisticsService.formatDuration(timeStats.averageDailyTime),
      subtitle: 'Per working day',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
      color: 'bg-green-500',
      bgColor: 'bg-green-50',
      textColor: 'text-green-600',
    },
    {
      title: 'Total Sessions',
      value: timeStats.totalRecords.toString(),
      subtitle: `${projectCount} projects`,
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
      color: 'bg-purple-500',
      bgColor: 'bg-purple-50',
      textColor: 'text-purple-600',
    },
    {
      title: 'Avg Session',
      value: StatisticsService.formatDuration(timeStats.averageSessionDuration),
      subtitle: 'Per session',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      ),
      color: 'bg-orange-500',
      bgColor: 'bg-orange-50',
      textColor: 'text-orange-600',
    },
  ];

  return (
    <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 ${className}`}>
      {metrics.map((metric, index) => (
        <div key={index} className={`${metric.bgColor} rounded-lg p-6 border border-gray-200`}>
          <div className="flex items-center">
            <div className={`flex-shrink-0 ${metric.color} rounded-md p-3 text-white`}>
              {metric.icon}
            </div>
            <div className="ml-4 flex-1">
              <div className="flex items-baseline">
                <p className={`text-2xl font-semibold ${metric.textColor}`}>
                  {metric.value}
                </p>
              </div>
              <p className="text-sm font-medium text-gray-900 mt-1">
                {metric.title}
              </p>
              <p className="text-sm text-gray-500">
                {metric.subtitle}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};