import React from 'react';
import { ActiveTimerProvider, useActiveTimer } from '../contexts/ActiveTimerContext';
import { ActiveTimerWidget } from '../components/ActiveTimerWidget';
import { ActiveTimerStartWidget } from '../components/ActiveTimerStartWidget';
import { LandingPage } from './LandingPage';
import { DataCacheProvider } from '../contexts/DataCacheContext';
import { Card, LoadingSpinner } from '../components/ui';

const ActiveTimerContent: React.FC = () => {
  const { activeRecord, loadActiveRecord, isLoading } = useActiveTimer();

  const timerIcon = (
    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );

  if (isLoading) {
    return (
      <Card title="Active Timer" icon={timerIcon}>
        <div className="flex items-center justify-center">
          <div className="text-center">
            <LoadingSpinner className="mx-auto mb-3" />
            <p className="text-gray-600">Loading active record...</p>
          </div>
        </div>
      </Card>
    );
  }

  if (activeRecord) {
    return (
      <Card title="Active Timer" icon={timerIcon}>
        <ActiveTimerWidget 
          activeRecord={activeRecord} 
          onRecordChange={loadActiveRecord}
        />
      </Card>
    );
  }

  return (
    <Card title="Active Timer" icon={timerIcon}>
      <ActiveTimerStartWidget onRecordChange={loadActiveRecord} />
    </Card>
  );
};

export const ActiveTimerPage: React.FC = () => {
  return (
    <LandingPage>
      <DataCacheProvider>
        <ActiveTimerProvider>
          <ActiveTimerContent />
        </ActiveTimerProvider>
      </DataCacheProvider>
    </LandingPage>
  );
};