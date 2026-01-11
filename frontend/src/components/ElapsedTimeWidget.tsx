import React, { useState, useEffect } from 'react';
import { TimeRecord } from '../types';

interface ElapsedTimeWidgetProps {
  activeRecord: TimeRecord | null;
}

export const ElapsedTimeWidget: React.FC<ElapsedTimeWidgetProps> = ({ activeRecord }) => {
  const [elapsedTime, setElapsedTime] = useState(0);

  // Update elapsed time every second when timer is active
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    if (activeRecord) {
      const updateElapsedTime = () => {
        try {
          const start = new Date(activeRecord.startTime);
          const now = new Date();
          const elapsed = Math.floor((now.getTime() - start.getTime()) / 1000);
          setElapsedTime(elapsed);
        } catch (error) {
          console.error('Error updating elapsed time:', error);
        }
      };

      // Update immediately
      updateElapsedTime();

      // Then update every second
      interval = setInterval(updateElapsedTime, 1000);
    } else {
      setElapsedTime(0);
    }

    return () => {
      if (interval) {
        clearInterval(interval);
        interval = null;
      }
    };
  }, [activeRecord]);

  const formatElapsedTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDisplayTime = (utcDateString: string): string => {
    const date = new Date(utcDateString);
    return date.toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZoneName: 'short'
    });
  };

  if (!activeRecord) {
    return null;
  }

  return (
    <div className="mb-6">
      <div className="text-3xl sm:text-4xl md:text-5xl font-mono font-bold text-green-900 tracking-tight break-all">
        {formatElapsedTime(elapsedTime)}
      </div>
      <p className="text-sm text-green-600 mt-1 break-all">
        Started at {formatDisplayTime(activeRecord.startTime)}
      </p>
    </div>
  );
};