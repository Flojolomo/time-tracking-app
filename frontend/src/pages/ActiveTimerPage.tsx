import React from 'react';
import { ActiveTimerProvider, useActiveTimer } from '../contexts/ActiveTimerContext';
import { ActiveTimerWidget } from '../components/ActiveTimerWidget';
import { LandingPage } from './LandingPage';

const ActiveTimerContent: React.FC = () => {
  const { activeRecord, loadActiveRecord, updateActiveRecord } = useActiveTimer();

  return (
    <ActiveTimerWidget 
      activeRecord={activeRecord} 
      onRecordChange={loadActiveRecord}
      onRecordUpdate={updateActiveRecord}
    />
  );
};

export const ActiveTimerPage: React.FC = () => {

  return (
    <LandingPage>
      <ActiveTimerProvider>
        <ActiveTimerContent />
      </ActiveTimerProvider>
    </LandingPage>
  );
};