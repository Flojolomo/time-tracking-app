/**
 * Service Worker registration and management utilities
 */

export interface ServiceWorkerStatus {
  isSupported: boolean;
  isRegistered: boolean;
  isActive: boolean;
  registration?: ServiceWorkerRegistration;
}

export interface OfflineData {
  pendingActions: number;
  lastSync: string | null;
  offlineActions: any[];
  cachedData: any[];
}

let swRegistration: ServiceWorkerRegistration | null = null;

/**
 * Register the service worker
 */
export async function registerServiceWorker(): Promise<ServiceWorkerStatus> {
  if (!('serviceWorker' in navigator)) {
    console.log('Service Worker not supported');
    return {
      isSupported: false,
      isRegistered: false,
      isActive: false
    };
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/'
    });

    swRegistration = registration;

    console.log('Service Worker registered successfully:', registration);

    // Handle updates
    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing;
      if (newWorker) {
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            // New service worker is available
            console.log('New service worker available');
            notifyUpdate();
          }
        });
      }
    });

    return {
      isSupported: true,
      isRegistered: true,
      isActive: registration.active !== null,
      registration
    };
  } catch (error) {
    console.error('Service Worker registration failed:', error);
    return {
      isSupported: true,
      isRegistered: false,
      isActive: false
    };
  }
}

/**
 * Unregister the service worker
 */
export async function unregisterServiceWorker(): Promise<boolean> {
  if (swRegistration) {
    try {
      const result = await swRegistration.unregister();
      swRegistration = null;
      return result;
    } catch (error) {
      console.error('Service Worker unregistration failed:', error);
      return false;
    }
  }
  return false;
}

/**
 * Update the service worker
 */
export async function updateServiceWorker(): Promise<void> {
  if (swRegistration) {
    try {
      await swRegistration.update();
    } catch (error) {
      console.error('Service Worker update failed:', error);
    }
  }
}

/**
 * Skip waiting and activate new service worker
 */
export function skipWaiting(): void {
  if (swRegistration && swRegistration.waiting) {
    swRegistration.waiting.postMessage({ type: 'SKIP_WAITING' });
  }
}

/**
 * Get offline data from service worker
 */
export async function getOfflineData(): Promise<OfflineData | null> {
  if (!swRegistration || !swRegistration.active) {
    return null;
  }

  return new Promise((resolve) => {
    const messageChannel = new MessageChannel();
    
    messageChannel.port1.onmessage = (event) => {
      if (event.data.type === 'OFFLINE_DATA') {
        resolve(event.data.data);
      }
    };

    if (swRegistration?.active) {
      swRegistration.active.postMessage(
        { type: 'GET_OFFLINE_DATA' },
        [messageChannel.port2]
      );
    }

    // Timeout after 5 seconds
    setTimeout(() => resolve(null), 5000);
  });
}

/**
 * Cache API response in service worker
 */
export function cacheApiResponse(url: string, responseData: any): void {
  if (swRegistration && swRegistration.active) {
    swRegistration.active.postMessage({
      type: 'CACHE_API_RESPONSE',
      data: { url, response: responseData }
    });
  }
}

/**
 * Check if the app is running in standalone mode (PWA)
 */
export function isStandalone(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true
  );
}

/**
 * Get service worker status
 */
export function getServiceWorkerStatus(): ServiceWorkerStatus {
  if (!('serviceWorker' in navigator)) {
    return {
      isSupported: false,
      isRegistered: false,
      isActive: false
    };
  }

  return {
    isSupported: true,
    isRegistered: swRegistration !== null,
    isActive: swRegistration?.active !== null,
    registration: swRegistration || undefined
  };
}

/**
 * Listen for service worker messages
 */
export function addServiceWorkerListener(
  callback: (message: any) => void
): () => void {
  const handleMessage = (event: MessageEvent) => {
    callback(event.data);
  };

  navigator.serviceWorker.addEventListener('message', handleMessage);

  return () => {
    navigator.serviceWorker.removeEventListener('message', handleMessage);
  };
}

/**
 * Notify about service worker updates
 */
function notifyUpdate(): void {
  // Dispatch custom event for update notification
  window.dispatchEvent(new CustomEvent('sw-update-available'));
}

/**
 * Request background sync
 */
export async function requestBackgroundSync(tag: string = 'sync-time-records'): Promise<void> {
  if (swRegistration && 'sync' in ServiceWorkerRegistration.prototype) {
    try {
      // Type assertion for sync property
      const registration = swRegistration as any;
      await registration.sync.register(tag);
      console.log('Background sync registered:', tag);
    } catch (error) {
      console.error('Background sync registration failed:', error);
    }
  }
}