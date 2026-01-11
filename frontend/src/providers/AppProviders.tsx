import React from 'react';
import { ViewStateProvider } from '../contexts/ViewStateContext';
import { NotificationProvider } from '../contexts/NotificationContext';
import { DataCacheProvider } from '../contexts/DataCacheContext';
import { ErrorBoundary } from '../components/ErrorBoundary';

interface AppProvidersProps {
  children: React.ReactNode;
}

export function AppProviders({ children }: AppProvidersProps) {
  return (
    <ErrorBoundary>
      <NotificationProvider>
        <ViewStateProvider>
          {children}
        </ViewStateProvider>
      </NotificationProvider>
    </ErrorBoundary>
  );
}

interface DataProvidersProps {
  children: React.ReactNode;
}

export function DataProviders({ children }: DataProvidersProps) {
  return (
    <DataCacheProvider>
      {children}
    </DataCacheProvider>
  );
}