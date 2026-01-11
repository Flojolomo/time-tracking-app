import React from 'react';
import { ActiveTimerProvider, useActiveTimer } from '../contexts/ActiveTimerContext';
import { ActiveTimerWidget } from '../components/ActiveTimerWidget';
import { ActiveTimerStartWidget } from '../components/ActiveTimerStartWidget';
import { LandingPage } from './LandingPage';
import { DataCacheProvider } from '../contexts/DataCacheContext';

const ActiveTimerContent: React.FC = () => {
  const { activeRecord, loadActiveRecord, isLoading } = useActiveTimer();

  const header = <div className="bg-gradient-to-r from-indigo-500 to-purple-600 px-6 py-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-white/20 rounded-lg">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-white">Active Timer</h2>
          </div>
        </div>

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
        { header }
        <div className="p-6 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-3"></div>
            <p className="text-gray-600">Loading active record...</p>
          </div>
        </div>
      </div>
    );
  }

  if (activeRecord) {
    return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
      { header }
      <div className="p-6">
        <ActiveTimerWidget 
          activeRecord={activeRecord} 
          onRecordChange={loadActiveRecord}
        />
      </div>
    </div>
  );
  }

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
      { header }
      <ActiveTimerStartWidget onRecordChange={loadActiveRecord} />
    </div>
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