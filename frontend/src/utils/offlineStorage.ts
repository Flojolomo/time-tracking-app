/**
 * Offline storage utilities for local data backup and synchronization
 */

export interface OfflineTimeRecord {
  id: string;
  projectName: string;
  description?: string;
  startTime: string;
  endTime: string;
  duration: number;
  tags?: string[];
  isOffline: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface OfflineAction {
  id: string;
  type: 'create' | 'update' | 'delete';
  endpoint: string;
  data: any;
  timestamp: number;
  retryCount: number;
}

export interface SyncStatus {
  lastSync: string | null;
  pendingActions: number;
  isOnline: boolean;
  isSyncing: boolean;
}

const STORAGE_KEYS = {
  TIME_RECORDS: 'timetracker_offline_records',
  PENDING_ACTIONS: 'timetracker_pending_actions',
  SYNC_STATUS: 'timetracker_sync_status',
  FORM_DRAFTS: 'timetracker_form_drafts'
};

/**
 * Local storage wrapper with error handling
 */
class SafeStorage {
  static get(key: string): any {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : null;
    } catch (error) {
      console.error('Error reading from localStorage:', error);
      return null;
    }
  }

  static set(key: string, value: any): boolean {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      console.error('Error writing to localStorage:', error);
      return false;
    }
  }

  static remove(key: string): boolean {
    try {
      localStorage.removeItem(key);
      return true;
    } catch (error) {
      console.error('Error removing from localStorage:', error);
      return false;
    }
  }

  static clear(): boolean {
    try {
      localStorage.clear();
      return true;
    } catch (error) {
      console.error('Error clearing localStorage:', error);
      return false;
    }
  }
}

/**
 * Offline time records management
 */
export class OfflineTimeRecords {
  static getAll(): OfflineTimeRecord[] {
    return SafeStorage.get(STORAGE_KEYS.TIME_RECORDS) || [];
  }

  static save(records: OfflineTimeRecord[]): boolean {
    return SafeStorage.set(STORAGE_KEYS.TIME_RECORDS, records);
  }

  static add(record: OfflineTimeRecord): boolean {
    const records = this.getAll();
    records.push(record);
    return this.save(records);
  }

  static update(id: string, updates: Partial<OfflineTimeRecord>): boolean {
    const records = this.getAll();
    const index = records.findIndex(r => r.id === id);
    
    if (index !== -1) {
      records[index] = { ...records[index], ...updates, updatedAt: new Date().toISOString() };
      return this.save(records);
    }
    
    return false;
  }

  static remove(id: string): boolean {
    const records = this.getAll();
    const filtered = records.filter(r => r.id !== id);
    return this.save(filtered);
  }

  static getById(id: string): OfflineTimeRecord | null {
    const records = this.getAll();
    return records.find(r => r.id === id) || null;
  }

  static getOfflineRecords(): OfflineTimeRecord[] {
    return this.getAll().filter(r => r.isOffline);
  }

  static clear(): boolean {
    return SafeStorage.remove(STORAGE_KEYS.TIME_RECORDS);
  }
}

/**
 * Pending actions management
 */
export class PendingActions {
  static getAll(): OfflineAction[] {
    return SafeStorage.get(STORAGE_KEYS.PENDING_ACTIONS) || [];
  }

  static save(actions: OfflineAction[]): boolean {
    return SafeStorage.set(STORAGE_KEYS.PENDING_ACTIONS, actions);
  }

  static add(action: Omit<OfflineAction, 'id' | 'timestamp' | 'retryCount'>): string {
    const actions = this.getAll();
    const newAction: OfflineAction = {
      ...action,
      id: Date.now().toString() + Math.random().toString(36).substring(2, 11),
      timestamp: Date.now(),
      retryCount: 0
    };
    
    actions.push(newAction);
    this.save(actions);
    
    return newAction.id;
  }

  static remove(id: string): boolean {
    const actions = this.getAll();
    const filtered = actions.filter(a => a.id !== id);
    return this.save(filtered);
  }

  static incrementRetry(id: string): boolean {
    const actions = this.getAll();
    const index = actions.findIndex(a => a.id === id);
    
    if (index !== -1) {
      actions[index].retryCount++;
      return this.save(actions);
    }
    
    return false;
  }

  static clear(): boolean {
    return SafeStorage.remove(STORAGE_KEYS.PENDING_ACTIONS);
  }

  static getPendingCount(): number {
    return this.getAll().length;
  }
}

/**
 * Sync status management
 */
export class SyncStatusManager {
  static get(): SyncStatus {
    return SafeStorage.get(STORAGE_KEYS.SYNC_STATUS) || {
      lastSync: null,
      pendingActions: 0,
      isOnline: navigator.onLine,
      isSyncing: false
    };
  }

  static update(updates: Partial<SyncStatus>): boolean {
    const current = this.get();
    const updated = { ...current, ...updates };
    return SafeStorage.set(STORAGE_KEYS.SYNC_STATUS, updated);
  }

  static setLastSync(timestamp: string = new Date().toISOString()): boolean {
    return this.update({ lastSync: timestamp });
  }

  static setOnlineStatus(isOnline: boolean): boolean {
    return this.update({ isOnline });
  }

  static setSyncingStatus(isSyncing: boolean): boolean {
    return this.update({ isSyncing });
  }

  static updatePendingCount(): boolean {
    const pendingActions = PendingActions.getPendingCount();
    return this.update({ pendingActions });
  }
}

/**
 * Form drafts management for unsaved changes
 */
export class FormDrafts {
  static save(formId: string, data: any): boolean {
    const drafts = SafeStorage.get(STORAGE_KEYS.FORM_DRAFTS) || {};
    drafts[formId] = {
      data,
      timestamp: Date.now()
    };
    return SafeStorage.set(STORAGE_KEYS.FORM_DRAFTS, drafts);
  }

  static get(formId: string): any {
    const drafts = SafeStorage.get(STORAGE_KEYS.FORM_DRAFTS) || {};
    return drafts[formId]?.data || null;
  }

  static remove(formId: string): boolean {
    const drafts = SafeStorage.get(STORAGE_KEYS.FORM_DRAFTS) || {};
    delete drafts[formId];
    return SafeStorage.set(STORAGE_KEYS.FORM_DRAFTS, drafts);
  }

  static getAll(): Record<string, any> {
    return SafeStorage.get(STORAGE_KEYS.FORM_DRAFTS) || {};
  }

  static clear(): boolean {
    return SafeStorage.remove(STORAGE_KEYS.FORM_DRAFTS);
  }

  static cleanOld(maxAge: number = 24 * 60 * 60 * 1000): boolean {
    const drafts = this.getAll();
    const now = Date.now();
    const cleaned: Record<string, any> = {};

    Object.entries(drafts).forEach(([key, value]: [string, any]) => {
      if (value.timestamp && (now - value.timestamp) < maxAge) {
        cleaned[key] = value;
      }
    });

    return SafeStorage.set(STORAGE_KEYS.FORM_DRAFTS, cleaned);
  }
}

/**
 * Utility functions
 */
export function generateOfflineId(): string {
  return 'offline_' + Date.now().toString() + '_' + Math.random().toString(36).substring(2, 11);
}

export function isOfflineId(id: string): boolean {
  return id.startsWith('offline_');
}

export function getStorageUsage(): { used: number; available: number } {
  if ('storage' in navigator && 'estimate' in navigator.storage) {
    navigator.storage.estimate().then(estimate => {
      return {
        used: estimate.usage || 0,
        available: estimate.quota || 0
      };
    });
  }
  
  // Fallback estimation
  let used = 0;
  for (let key in localStorage) {
    if (localStorage.hasOwnProperty(key)) {
      used += localStorage[key].length;
    }
  }
  
  return {
    used,
    available: 5 * 1024 * 1024 // Assume 5MB limit
  };
}

export function clearAllOfflineData(): boolean {
  try {
    OfflineTimeRecords.clear();
    PendingActions.clear();
    FormDrafts.clear();
    SafeStorage.remove(STORAGE_KEYS.SYNC_STATUS);
    return true;
  } catch (error) {
    console.error('Error clearing offline data:', error);
    return false;
  }
}