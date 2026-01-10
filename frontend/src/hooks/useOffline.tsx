import { useState, useEffect, useCallback } from 'react';
import { SyncManager, SyncResult } from '../utils/syncManager';
import { FormDrafts } from '../utils/offlineStorage';
import { useNetworkStatus } from './useNetworkStatus';
import { useNotifications } from '../contexts/NotificationContext';

export interface OfflineStatus {
  isOnline: boolean;
  isSyncing: boolean;
  pendingActions: number;
  lastSync: string | null;
  hasUnsavedChanges: boolean;
}

export function useOffline() {
  const [offlineStatus, setOfflineStatus] = useState<OfflineStatus>({
    isOnline: true,
    isSyncing: false,
    pendingActions: 0,
    lastSync: null,
    hasUnsavedChanges: false
  });

  const networkStatus = useNetworkStatus();
  const { showSuccess, showError, showWarning } = useNotifications();
  const syncManager = SyncManager.getInstance();

  // Update offline status
  const updateOfflineStatus = useCallback(() => {
    const syncStatus = syncManager.getSyncStatus();
    const drafts = FormDrafts.getAll();
    
    setOfflineStatus({
      isOnline: networkStatus.isOnline,
      isSyncing: syncStatus.isSyncing,
      pendingActions: syncStatus.pendingActions,
      lastSync: syncStatus.lastSync,
      hasUnsavedChanges: Object.keys(drafts).length > 0
    });
  }, [networkStatus.isOnline, syncManager]);

  // Set up sync listener
  useEffect(() => {
    const removeSyncListener = syncManager.addSyncListener((result: SyncResult) => {
      if (result.success) {
        showSuccess(
          'Data Synchronized',
          `${result.syncedActions} actions synced successfully`
        );
      } else if (result.failedActions > 0) {
        showError(
          'Sync Failed',
          `${result.failedActions} actions failed to sync. Will retry when connection improves.`
        );
      }
      
      updateOfflineStatus();
    });

    return removeSyncListener;
  }, [syncManager, showSuccess, showError, updateOfflineStatus]);

  // Update status when network changes
  useEffect(() => {
    updateOfflineStatus();
  }, [networkStatus, updateOfflineStatus]);

  // Show offline notification
  useEffect(() => {
    if (!networkStatus.isOnline && offlineStatus.pendingActions > 0) {
      showWarning(
        'Working Offline',
        `You have ${offlineStatus.pendingActions} pending changes that will sync when connection is restored.`
      );
    }
  }, [networkStatus.isOnline, offlineStatus.pendingActions, showWarning]);

  // Manual sync function
  const syncNow = useCallback(async () => {
    if (!networkStatus.isOnline) {
      showError('Cannot Sync', 'No internet connection available');
      return false;
    }

    try {
      const result = await syncManager.forcSync();
      return result.success;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Sync failed';
      showError('Sync Failed', errorMessage);
      return false;
    }
  }, [networkStatus.isOnline, syncManager, showError]);

  // Save form draft
  const saveDraft = useCallback((formId: string, data: Record<string, unknown>) => {
    const success = FormDrafts.save(formId, data);
    if (success) {
      updateOfflineStatus();
    }
    return success;
  }, [updateOfflineStatus]);

  // Get form draft
  const getDraft = useCallback((formId: string) => {
    return FormDrafts.get(formId);
  }, []);

  // Remove form draft
  const removeDraft = useCallback((formId: string) => {
    const success = FormDrafts.remove(formId);
    if (success) {
      updateOfflineStatus();
    }
    return success;
  }, [updateOfflineStatus]);

  // Clear all offline data
  const clearOfflineData = useCallback(() => {
    syncManager.clearOfflineData();
    FormDrafts.clear();
    updateOfflineStatus();
    showSuccess('Offline Data Cleared', 'All offline data has been removed');
  }, [syncManager, updateOfflineStatus, showSuccess]);

  return {
    offlineStatus,
    syncNow,
    saveDraft,
    getDraft,
    removeDraft,
    clearOfflineData,
    // Convenience getters
    isOnline: offlineStatus.isOnline,
    isSyncing: offlineStatus.isSyncing,
    hasPendingChanges: offlineStatus.pendingActions > 0,
    hasUnsavedChanges: offlineStatus.hasUnsavedChanges
  };
}

// Hook for form auto-save functionality
export function useFormAutoSave(formId: string, data: Record<string, unknown> | null, enabled: boolean = true) {
  const { saveDraft, removeDraft } = useOffline();
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  // Auto-save effect
  useEffect(() => {
    if (!enabled || !data) return;

    // Debounce auto-save
    const timeoutId = setTimeout(() => {
      const success = saveDraft(formId, data);
      if (success) {
        setLastSaved(new Date());
      }
    }, 2000); // Save after 2 seconds of inactivity

    return () => clearTimeout(timeoutId);
  }, [data, formId, enabled, saveDraft]);

  // Clear draft when form is submitted
  const clearDraft = useCallback(() => {
    removeDraft(formId);
    setLastSaved(null);
  }, [formId, removeDraft]);

  return {
    lastSaved,
    clearDraft
  };
}