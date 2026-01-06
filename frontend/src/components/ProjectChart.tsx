/**
 * Project Chart Component
 * Displays project time distribution using Chart.js pie/doughnut/bar charts
 */

import React from 'react';
import {
  Chart as ChartJS,
  ArcElement,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Pie, Doughnut, Bar } from 'react-chartjs-2';
import type { ProjectStatistics } from '../types';
import { StatisticsService } from '../utils';

// Register Chart.js components
ChartJS.register(
  ArcElement,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

interface ProjectChartProps {
  projectStats: ProjectStatistics[];
  type?: 'pie' | 'doughnut' | 'bar';
  className?: string;
  height?: number;
}

export const ProjectChart: React.FC<ProjectChartProps> = ({
  projectStats,
  type = 'pie',
  className = '',
  height = 300
}) => {
  // Generate colors for projects
  const generateColors = (count: number) => {
    const colors = [
      '#3B82F6', // blue-500
      '#EF4444', // red-500
      '#10B981', // emerald-500
      '#F59E0B', // amber-500
      '#8B5CF6', // violet-500
      '#EC4899', // pink-500
      '#06B6D4', // cyan-500
      '#84CC16', // lime-500
      '#F97316', // orange-500
      '#6366F1', // indigo-500
    ];
    
    const result = [];
    for (let i = 0; i < count; i++) {
      result.push(colors[i % colors.length]);
    }
    return result;
  };

  // Prepare chart data
  const chartData = {
    labels: projectStats.map(stat => stat.projectName),
    datasets: [
      {
        label: type === 'bar' ? 'Time (hours)' : 'Time Distribution',
        data: type === 'bar' 
          ? projectStats.map(stat => parseFloat((stat.totalDuration / 60).toFixed(1))) // Convert to hours for bar chart as numbers
          : projectStats.map(stat => stat.totalDuration), // Keep in minutes for pie/doughnut
        backgroundColor: generateColors(projectStats.length),
        borderColor: generateColors(projectStats.length).map(color => color),
        borderWidth: 1,
      },
    ],
  };

  // Chart options
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          padding: 20,
          usePointStyle: true,
          font: {
            size: 12,
          },
        },
      },
      tooltip: {
        callbacks: {
          label: (context: any) => {
            const stat = projectStats[context.dataIndex];
            if (type === 'bar') {
              return `${stat.projectName}: ${StatisticsService.formatDuration(stat.totalDuration)} (${StatisticsService.formatPercentage(stat.percentage)})`;
            } else {
              return `${stat.projectName}: ${StatisticsService.formatDuration(stat.totalDuration)} (${StatisticsService.formatPercentage(stat.percentage)})`;
            }
          },
        },
      },
    },
    ...(type === 'bar' && {
      scales: {
        y: {
          beginAtZero: true,
          title: {
            display: true,
            text: 'Hours',
          },
          ticks: {
            callback: function(value: any) {
              return value + 'h';
            },
          },
        },
        x: {
          title: {
            display: true,
            text: 'Projects',
          },
        },
      },
    }),
  };

  // Show message if no data
  if (!projectStats || projectStats.length === 0) {
    return (
      <div className={`flex items-center justify-center h-64 ${className}`}>
        <div className="text-center">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No project data</h3>
          <p className="mt-1 text-sm text-gray-500">Start tracking time to see project distribution.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`} style={{ height: `${height}px` }}>
      {type === 'pie' && <Pie data={chartData} options={chartOptions} />}
      {type === 'doughnut' && <Doughnut data={chartData} options={chartOptions} />}
      {type === 'bar' && <Bar data={chartData} options={chartOptions} />}
    </div>
  );
};