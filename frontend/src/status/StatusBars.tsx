import React from 'react';
import { NetworkStatusBanner } from '../components/NetworkStatusBanner';
import { OfflineStatusBar } from '../components/OfflineStatusBar';
import { NotificationContainer } from '../components/NotificationContainer';

export function StatusBars() {
  return (
    <>
      <NetworkStatusBanner />
      <OfflineStatusBar />
      <NotificationContainer />
    </>
  );
}