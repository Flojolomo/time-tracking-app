/**
 * Timeline Chart Component
 * Displays daily time tracking patterns using Chart.js line/bar charts
 */

import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';
import type { DailyStatistics } from '../types';
import { StatisticsService } from '../utils';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface TimelineChartProps {
  dailyStats: DailyStatistics[];
  dateRange: 'week' | 'month' | 'quarter';
  type?: 'line' | 'bar';
  className?: string;
  height?: number;
}

export const TimelineChart: React.FC<TimelineChartProps> = ({
  dailyStats,
  dateRange,
  type = 'line',
  className = '',
  height = 300
}) => {
  // Sort daily stats by date (oldest first for timeline)
  const sortedStats = [...dailyStats].sort((a, b) => 
    new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  // Format dates for display
  const formatDateLabel = (dateStr: string) => {
    const date = new Date(dateStr);
    if (dateRange === 'week') {
      return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    } else if (dateRange === 'month') {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  };

  // Prepare chart data
  const chartData = {
    labels: sortedStats.map(stat => formatDateLabel(stat.date)),
    datasets: [
      {
        label: 'Daily Time (hours)',
        data: sortedStats.map(stat => parseFloat((stat.totalDuration / 60).toFixed(1))), // Convert to hours as numbers
        borderColor: '#3B82F6',
        backgroundColor: type === 'line' ? 'rgba(59, 130, 246, 0.1)' : 'rgba(59, 130, 246, 0.8)',
        borderWidth: 2,
        fill: type === 'line',
        tension: 0.4,
        pointBackgroundColor: '#3B82F6',
        pointBorderColor: '#ffffff',
        pointBorderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6,
      },
      {
        label: 'Sessions',
        data: sortedStats.map(stat => stat.recordCount),
        borderColor: '#10B981',
        backgroundColor: type === 'line' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(16, 185, 129, 0.8)',
        borderWidth: 2,
        fill: false,
        tension: 0.4,
        pointBackgroundColor: '#10B981',
        pointBorderColor: '#ffffff',
        pointBorderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6,
        yAxisID: 'y1',
      },
    ],
  };

  // Chart options
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          usePointStyle: true,
          padding: 20,
          font: {
            size: 12,
          },
        },
      },
      tooltip: {
        callbacks: {
          title: (context: any) => {
            const index = context[0].dataIndex;
            const stat = sortedStats[index];
            return new Date(stat.date).toLocaleDateString('en-US', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            });
          },
          label: (context: any) => {
            const index = context.dataIndex;
            const stat = sortedStats[index];
            
            if (context.dataset.label === 'Daily Time (hours)') {
              return `Time: ${StatisticsService.formatDuration(stat.totalDuration)}`;
            } else {
              return `Sessions: ${stat.recordCount}`;
            }
          },
          afterBody: (context: any) => {
            const index = context[0].dataIndex;
            const stat = sortedStats[index];
            
            if (stat.projects.length > 0) {
              return [`Projects: ${stat.projects.join(', ')}`];
            }
            return [];
          },
        },
      },
    },
    scales: {
      x: {
        display: true,
        title: {
          display: true,
          text: 'Date',
        },
        grid: {
          display: false,
        },
      },
      y: {
        type: 'linear' as const,
        display: true,
        position: 'left' as const,
        title: {
          display: true,
          text: 'Hours',
        },
        beginAtZero: true,
        ticks: {
          callback: function(value: any) {
            return value + 'h';
          },
        },
      },
      y1: {
        type: 'linear' as const,
        display: true,
        position: 'right' as const,
        title: {
          display: true,
          text: 'Sessions',
        },
        beginAtZero: true,
        grid: {
          drawOnChartArea: false,
        },
        ticks: {
          stepSize: 1,
        },
      },
    },
  };

  // Show message if no data
  if (!dailyStats || dailyStats.length === 0) {
    return (
      <div className={`flex items-center justify-center h-64 ${className}`}>
        <div className="text-center">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No timeline data</h3>
          <p className="mt-1 text-sm text-gray-500">Start tracking time to see your daily patterns.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`} style={{ height: `${height}px` }}>
      {type === 'line' && <Line data={chartData} options={chartOptions} />}
      {type === 'bar' && <Bar data={chartData} options={chartOptions} />}
    </div>
  );
};