/**
 * Statistics calculation engine for time tracking analytics
 * Provides aggregation functions for project and tag totals, time calculations, and productivity metrics
 */

import type { TimeRecord } from '../types';

export interface ProjectStatistics {
  projectName: string;
  totalDuration: number; // in minutes
  recordCount: number;
  averageDuration: number; // in minutes
  percentage: number; // percentage of total time
}

export interface TagStatistics {
  tagName: string;
  totalDuration: number; // in minutes
  recordCount: number;
  percentage: number; // percentage of total time
}

export interface TimeStatistics {
  totalDuration: number; // in minutes
  totalRecords: number;
  averageDailyTime: number; // in minutes
  averageSessionDuration: number; // in minutes
  productiveHours: number; // total hours worked
}

export interface DailyStatistics {
  date: string; // YYYY-MM-DD format
  totalDuration: number; // in minutes
  recordCount: number;
  projects: string[];
}

export interface WeeklyStatistics {
  weekStart: string; // YYYY-MM-DD format
  weekEnd: string; // YYYY-MM-DD format
  totalDuration: number; // in minutes
  dailyBreakdown: DailyStatistics[];
  averageDailyTime: number; // in minutes
}

export interface MonthlyStatistics {
  month: string; // YYYY-MM format
  totalDuration: number; // in minutes
  weeklyBreakdown: WeeklyStatistics[];
  averageDailyTime: number; // in minutes
  workingDays: number;
}

export class StatisticsService {
  /**
   * Calculate project-based statistics from time records
   */
  static calculateProjectStatistics(records: TimeRecord[]): ProjectStatistics[] {
    if (!records || records.length === 0) {
      return [];
    }

    // Calculate total duration for percentage calculations
    const totalDuration = records.reduce((sum, record) => sum + (record.duration || 0), 0);

    // Group records by project
    const projectGroups = records.reduce((groups, record) => {
      const projectName = record.projectName;
      if (!groups[projectName]) {
        groups[projectName] = [];
      }
      groups[projectName].push(record);
      return groups;
    }, {} as Record<string, TimeRecord[]>);

    // Calculate statistics for each project
    const projectStats: ProjectStatistics[] = Object.entries(projectGroups).map(([projectName, projectRecords]) => {
      const projectTotalDuration = projectRecords.reduce((sum, record) => sum + (record.duration || 0), 0);
      const recordCount = projectRecords.length;
      const averageDuration = recordCount > 0 ? projectTotalDuration / recordCount : 0;
      const percentage = totalDuration > 0 ? (projectTotalDuration / totalDuration) * 100 : 0;

      return {
        projectName,
        totalDuration: projectTotalDuration,
        recordCount,
        averageDuration,
        percentage
      };
    });

    // Sort by total duration (descending)
    return projectStats.sort((a, b) => b.totalDuration - a.totalDuration);
  }

  /**
   * Calculate tag-based statistics from time records
   */
  static calculateTagStatistics(records: TimeRecord[]): TagStatistics[] {
    if (!records || records.length === 0) {
      return [];
    }

    // Calculate total duration for percentage calculations
    const totalDuration = records.reduce((sum, record) => sum + (record.duration || 0), 0);

    // Collect all tags with their associated durations
    const tagDurations: Record<string, { duration: number; count: number }> = {};

    records.forEach(record => {
      const tags = record.tags || [];
      const recordDuration = record.duration || 0;

      tags.forEach(tag => {
        if (!tagDurations[tag]) {
          tagDurations[tag] = { duration: 0, count: 0 };
        }
        tagDurations[tag].duration += recordDuration;
        tagDurations[tag].count += 1;
      });
    });

    // Convert to TagStatistics array
    const tagStats: TagStatistics[] = Object.entries(tagDurations).map(([tagName, data]) => {
      const percentage = totalDuration > 0 ? (data.duration / totalDuration) * 100 : 0;

      return {
        tagName,
        totalDuration: data.duration,
        recordCount: data.count,
        percentage
      };
    });

    // Sort by total duration (descending)
    return tagStats.sort((a, b) => b.totalDuration - a.totalDuration);
  }

  /**
   * Calculate overall time statistics
   */
  static calculateTimeStatistics(records: TimeRecord[]): TimeStatistics {
    if (!records || records.length === 0) {
      return {
        totalDuration: 0,
        totalRecords: 0,
        averageDailyTime: 0,
        averageSessionDuration: 0,
        productiveHours: 0
      };
    }

    const totalDuration = records.reduce((sum, record) => sum + (record.duration || 0), 0);
    const totalRecords = records.length;
    const averageSessionDuration = totalRecords > 0 ? totalDuration / totalRecords : 0;
    const productiveHours = totalDuration / 60; // Convert minutes to hours

    // Calculate unique days to get average daily time
    const uniqueDates = new Set(
      records.map(record => new Date(record.startTime).toISOString().split('T')[0])
    );
    const uniqueDays = uniqueDates.size;
    const averageDailyTime = uniqueDays > 0 ? totalDuration / uniqueDays : 0;

    return {
      totalDuration,
      totalRecords,
      averageDailyTime,
      averageSessionDuration,
      productiveHours
    };
  }

  /**
   * Calculate daily statistics for a given date range
   */
  static calculateDailyStatistics(records: TimeRecord[]): DailyStatistics[] {
    if (!records || records.length === 0) {
      return [];
    }

    // Group records by date
    const dailyGroups = records.reduce((groups, record) => {
      const date = new Date(record.startTime).toISOString().split('T')[0];
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(record);
      return groups;
    }, {} as Record<string, TimeRecord[]>);

    // Calculate statistics for each day
    const dailyStats: DailyStatistics[] = Object.entries(dailyGroups).map(([date, dayRecords]) => {
      const totalDuration = dayRecords.reduce((sum, record) => sum + (record.duration || 0), 0);
      const recordCount = dayRecords.length;
      const projects = [...new Set(dayRecords.map(record => record.projectName))];

      return {
        date,
        totalDuration,
        recordCount,
        projects
      };
    });

    // Sort by date (most recent first)
    return dailyStats.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  /**
   * Calculate weekly statistics
   */
  static calculateWeeklyStatistics(records: TimeRecord[]): WeeklyStatistics[] {
    if (!records || records.length === 0) {
      return [];
    }

    // Group records by week
    const weeklyGroups: Record<string, TimeRecord[]> = {};

    records.forEach(record => {
      const date = new Date(record.startTime);
      const weekStart = this.getWeekStart(date);
      const weekKey = weekStart.toISOString().split('T')[0];

      if (!weeklyGroups[weekKey]) {
        weeklyGroups[weekKey] = [];
      }
      weeklyGroups[weekKey].push(record);
    });

    // Calculate statistics for each week
    const weeklyStats: WeeklyStatistics[] = Object.entries(weeklyGroups).map(([weekStartStr, weekRecords]) => {
      const weekStart = new Date(weekStartStr);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);

      const totalDuration = weekRecords.reduce((sum, record) => sum + (record.duration || 0), 0);
      const dailyBreakdown = this.calculateDailyStatistics(weekRecords);
      const averageDailyTime = dailyBreakdown.length > 0 ? totalDuration / 7 : 0; // 7 days in a week

      return {
        weekStart: weekStartStr,
        weekEnd: weekEnd.toISOString().split('T')[0],
        totalDuration,
        dailyBreakdown,
        averageDailyTime
      };
    });

    // Sort by week start date (most recent first)
    return weeklyStats.sort((a, b) => new Date(b.weekStart).getTime() - new Date(a.weekStart).getTime());
  }

  /**
   * Calculate monthly statistics
   */
  static calculateMonthlyStatistics(records: TimeRecord[]): MonthlyStatistics[] {
    if (!records || records.length === 0) {
      return [];
    }

    // Group records by month
    const monthlyGroups: Record<string, TimeRecord[]> = {};

    records.forEach(record => {
      const date = new Date(record.startTime);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

      if (!monthlyGroups[monthKey]) {
        monthlyGroups[monthKey] = [];
      }
      monthlyGroups[monthKey].push(record);
    });

    // Calculate statistics for each month
    const monthlyStats: MonthlyStatistics[] = Object.entries(monthlyGroups).map(([month, monthRecords]) => {
      const totalDuration = monthRecords.reduce((sum, record) => sum + (record.duration || 0), 0);
      const weeklyBreakdown = this.calculateWeeklyStatistics(monthRecords);
      
      // Calculate working days (days with at least one record)
      const uniqueDates = new Set(
        monthRecords.map(record => new Date(record.startTime).toISOString().split('T')[0])
      );
      const workingDays = uniqueDates.size;
      const averageDailyTime = workingDays > 0 ? totalDuration / workingDays : 0;

      return {
        month,
        totalDuration,
        weeklyBreakdown,
        averageDailyTime,
        workingDays
      };
    });

    // Sort by month (most recent first)
    return monthlyStats.sort((a, b) => b.month.localeCompare(a.month));
  }

  /**
   * Get productivity metrics for a given time period
   */
  static calculateProductivityMetrics(records: TimeRecord[]): {
    peakHours: { hour: number; duration: number }[];
    mostProductiveDay: string | null;
    averageSessionLength: number;
    longestSession: number;
    shortestSession: number;
  } {
    if (!records || records.length === 0) {
      return {
        peakHours: [],
        mostProductiveDay: null,
        averageSessionLength: 0,
        longestSession: 0,
        shortestSession: 0
      };
    }

    // Calculate peak hours
    const hourlyDurations: Record<number, number> = {};
    records.forEach(record => {
      const hour = new Date(record.startTime).getHours();
      const duration = record.duration || 0;
      hourlyDurations[hour] = (hourlyDurations[hour] || 0) + duration;
    });

    const peakHours = Object.entries(hourlyDurations)
      .map(([hour, duration]) => ({ hour: parseInt(hour), duration }))
      .sort((a, b) => b.duration - a.duration)
      .slice(0, 5); // Top 5 peak hours

    // Find most productive day
    const dailyStats = this.calculateDailyStatistics(records);
    const mostProductiveDay = dailyStats.length > 0 
      ? dailyStats.reduce((max, day) => day.totalDuration > max.totalDuration ? day : max).date
      : null;

    // Calculate session metrics
    const durations = records.map(record => record.duration || 0).filter(d => d > 0);
    const averageSessionLength = durations.length > 0 ? durations.reduce((sum, d) => sum + d, 0) / durations.length : 0;
    const longestSession = durations.length > 0 ? Math.max(...durations) : 0;
    const shortestSession = durations.length > 0 ? Math.min(...durations) : 0;

    return {
      peakHours,
      mostProductiveDay,
      averageSessionLength,
      longestSession,
      shortestSession
    };
  }

  /**
   * Helper function to get the start of the week (Monday) for a given date
   */
  private static getWeekStart(date: Date): Date {
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
    const weekStart = new Date(date.setDate(diff));
    weekStart.setHours(0, 0, 0, 0);
    return weekStart;
  }

  /**
   * Format duration from minutes to human-readable format
   */
  static formatDuration(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    
    if (hours === 0) {
      return `${mins}m`;
    } else if (mins === 0) {
      return `${hours}h`;
    } else {
      return `${hours}h ${mins}m`;
    }
  }

  /**
   * Format percentage to display format
   */
  static formatPercentage(percentage: number): string {
    return `${percentage.toFixed(1)}%`;
  }
}