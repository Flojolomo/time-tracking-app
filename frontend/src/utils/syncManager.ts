/**
 * Sync manager for handling offline data synchronization
 */

import { 
  PendingActions, 
  OfflineTimeRecords, 
  SyncStatusManager, 
  OfflineAction,
  OfflineTimeRecord 
} from './offlineStorage';
import { TimeRecordService } from './timeRecordService';
import { isOnline, addNetworkListener } from './networkUtils';

export interface SyncResult {
  success: boolean;
  syncedActions: number;
  failedActions: number;
  errors: string[];
}

export interface SyncOptions {
  maxRetries?: number;
  batchSize?: number;
  retryDelay?: number;
}

export class SyncManager {
  private static instance: SyncManager;
  private isSyncing = false;
  private syncListeners: ((result: SyncResult) => void)[] = [];
  private networkListener?: () => void;

  private constructor() {
    this.setupNetworkListener();
  }

  static getInstance(): SyncManager {
    if (!SyncManager.instance) {
      SyncManager.instance = new SyncManager();
    }
    return SyncManager.instance;
  }

  /**
   * Set up network listener to auto-sync when coming back online
   */
  private setupNetworkListener(): void {
    this.networkListener = addNetworkListener(
      () => {
        console.log('Network restored, starting auto-sync...');
        SyncStatusManager.setOnlineStatus(true);
        this.syncPendingActions();
      },
      () => {
        console.log('Network lost');
        SyncStatusManager.setOnlineStatus(false);
      }
    );
  }

  /**
   * Add a sync listener
   */
  addSyncListener(listener: (result: SyncResult) => void): () => void {
    this.syncListeners.push(listener);
    return () => {
      const index = this.syncListeners.indexOf(listener);
      if (index > -1) {
        this.syncListeners.splice(index, 1);
      }
    };
  }

  /**
   * Notify sync listeners
   */
  private notifySyncListeners(result: SyncResult): void {
    this.syncListeners.forEach(listener => {
      try {
        listener(result);
      } catch (error) {
        console.error('Error in sync listener:', error);
      }
    });
  }

  /**
   * Check if currently syncing
   */
  isSyncInProgress(): boolean {
    return this.isSyncing;
  }

  /**
   * Sync all pending actions
   */
  async syncPendingActions(options: SyncOptions = {}): Promise<SyncResult> {
    if (this.isSyncing) {
      console.log('Sync already in progress');
      return {
        success: false,
        syncedActions: 0,
        failedActions: 0,
        errors: ['Sync already in progress']
      };
    }

    if (!isOnline()) {
      console.log('Cannot sync while offline');
      return {
        success: false,
        syncedActions: 0,
        failedActions: 0,
        errors: ['Device is offline']
      };
    }

    this.isSyncing = true;
    SyncStatusManager.setSyncingStatus(true);

    const result: SyncResult = {
      success: true,
      syncedActions: 0,
      failedActions: 0,
      errors: []
    };

    try {
      const pendingActions = PendingActions.getAll();
      console.log(`Starting sync of ${pendingActions.length} pending actions`);

      const {
        maxRetries = 3,
        batchSize = 5,
        retryDelay = 1000
      } = options;

      // Process actions in batches
      for (let i = 0; i < pendingActions.length; i += batchSize) {
        const batch = pendingActions.slice(i, i + batchSize);
        
        await Promise.all(
          batch.map(async (action) => {
            try {
              await this.syncAction(action, maxRetries, retryDelay);
              result.syncedActions++;
              PendingActions.remove(action.id);
            } catch (error: any) {
              result.failedActions++;
              result.errors.push(`Action ${action.id}: ${error.message}`);
              
              // Increment retry count
              PendingActions.incrementRetry(action.id);
              
              // Remove action if max retries exceeded
              if (action.retryCount >= maxRetries) {
                console.log(`Removing action ${action.id} after ${maxRetries} retries`);
                PendingActions.remove(action.id);
              }
            }
          })
        );
      }

      // Update sync status
      SyncStatusManager.setLastSync();
      SyncStatusManager.updatePendingCount();

      result.success = result.failedActions === 0;

    } catch (error: any) {
      result.success = false;
      result.errors.push(`Sync failed: ${error.message}`);
    } finally {
      this.isSyncing = false;
      SyncStatusManager.setSyncingStatus(false);
      
      console.log('Sync completed:', result);
      this.notifySyncListeners(result);
    }

    return result;
  }

  /**
   * Sync a single action
   */
  private async syncAction(action: OfflineAction, maxRetries: number, retryDelay: number): Promise<void> {
    let lastError: Error;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        await this.executeAction(action);
        return; // Success
      } catch (error: any) {
        lastError = error;
        
        if (attempt < maxRetries) {
          // Wait before retrying
          await new Promise(resolve => setTimeout(resolve, retryDelay * attempt));
        }
      }
    }

    throw lastError!;
  }

  /**
   * Execute a single action
   */
  private async executeAction(action: OfflineAction): Promise<void> {
    const { type, endpoint, data } = action;

    switch (type) {
      case 'create':
        if (endpoint.includes('/time-records')) {
          await TimeRecordService.createTimeRecord(data);
        }
        break;

      case 'update':
        if (endpoint.includes('/time-records')) {
          await TimeRecordService.updateTimeRecord(data);
        }
        break;

      case 'delete':
        if (endpoint.includes('/time-records')) {
          const id = endpoint.split('/').pop();
          if (id) {
            await TimeRecordService.deleteTimeRecord(id);
          }
        }
        break;

      default:
        throw new Error(`Unknown action type: ${type}`);
    }
  }

  /**
   * Queue an action for later sync
   */
  queueAction(
    type: 'create' | 'update' | 'delete',
    endpoint: string,
    data: any
  ): string {
    const actionId = PendingActions.add({
      type,
      endpoint,
      data
    });

    SyncStatusManager.updatePendingCount();

    // Try to sync immediately if online
    if (isOnline() && !this.isSyncing) {
      setTimeout(() => this.syncPendingActions(), 100);
    }

    return actionId;
  }

  /**
   * Create offline time record
   */
  createOfflineTimeRecord(data: any): OfflineTimeRecord {
    const offlineRecord: OfflineTimeRecord = {
      id: `offline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      projectName: data.projectName,
      description: data.description,
      startTime: data.startTime,
      endTime: data.endTime,
      duration: data.duration,
      tags: data.tags,
      isOffline: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Store locally
    OfflineTimeRecords.add(offlineRecord);

    // Queue for sync
    this.queueAction('create', '/api/time-records', data);

    return offlineRecord;
  }

  /**
   * Update offline time record
   */
  updateOfflineTimeRecord(id: string, data: any): boolean {
    const success = OfflineTimeRecords.update(id, data);
    
    if (success) {
      // Queue for sync
      this.queueAction('update', `/api/time-records/${id}`, { id, ...data });
    }

    return success;
  }

  /**
   * Delete offline time record
   */
  deleteOfflineTimeRecord(id: string): boolean {
    const success = OfflineTimeRecords.remove(id);
    
    if (success) {
      // Queue for sync
      this.queueAction('delete', `/api/time-records/${id}`, { id });
    }

    return success;
  }

  /**
   * Get sync status
   */
  getSyncStatus() {
    return {
      ...SyncStatusManager.get(),
      isSyncing: this.isSyncing,
      pendingActions: PendingActions.getPendingCount()
    };
  }

  /**
   * Force sync now
   */
  async forcSync(): Promise<SyncResult> {
    return this.syncPendingActions();
  }

  /**
   * Clear all offline data
   */
  clearOfflineData(): void {
    PendingActions.clear();
    OfflineTimeRecords.clear();
    SyncStatusManager.update({
      lastSync: null,
      pendingActions: 0,
      isSyncing: false
    });
  }

  /**
   * Cleanup
   */
  destroy(): void {
    if (this.networkListener) {
      this.networkListener();
    }
    this.syncListeners = [];
  }
}