// Service Worker for Time Tracking App
// Provides offline functionality and background sync

const CACHE_NAME = 'time-tracker-v3';
const STATIC_CACHE_NAME = 'time-tracker-static-v3';

// Files to cache for offline functionality
const STATIC_FILES = [
  '/',
  '/index.html'
];

// API endpoints that should be cached
const API_CACHE_PATTERNS = [
  /\/api\/time-records/,
  /\/api\/projects/
];

// Install event - cache static files
self.addEventListener('install', (event) => {
  console.log('Service Worker installing...');
  
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME)
      .then((cache) => {
        console.log('Caching static files');
        return cache.addAll(STATIC_FILES);
      })
      .then(() => {
        // Skip waiting to activate immediately
        return self.skipWaiting();
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker activating...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME && cacheName !== STATIC_CACHE_NAME) {
              console.log('Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        // Take control of all clients immediately
        return self.clients.claim();
      })
  );
});

// Fetch event - handle network requests
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Handle API requests
  if (isApiRequest(url)) {
    event.respondWith(handleApiRequest(request));
    return;
  }

  // Handle static file requests
  if (request.method === 'GET') {
    event.respondWith(handleStaticRequest(request));
    return;
  }
});

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  console.log('Background sync triggered:', event.tag);
  
  if (event.tag === 'sync-time-records') {
    event.waitUntil(syncTimeRecords());
  }
});

// Message handling for communication with main thread
self.addEventListener('message', (event) => {
  const { type, data } = event.data;
  
  switch (type) {
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;
    case 'CACHE_API_RESPONSE':
      cacheApiResponse(data.url, data.response);
      break;
    case 'GET_OFFLINE_DATA':
      getOfflineData().then(offlineData => {
        event.ports[0].postMessage({ type: 'OFFLINE_DATA', data: offlineData });
      });
      break;
  }
});

// Helper functions

function isApiRequest(url) {
  return API_CACHE_PATTERNS.some(pattern => pattern.test(url.pathname));
}

async function handleApiRequest(request) {
  const url = new URL(request.url);
  
  try {
    // Try network first
    const networkResponse = await fetch(request);
    
    // Cache successful GET requests
    if (request.method === 'GET' && networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.log('Network request failed, trying cache:', url.pathname);
    
    // If network fails, try cache for GET requests
    if (request.method === 'GET') {
      const cachedResponse = await caches.match(request);
      if (cachedResponse) {
        return cachedResponse;
      }
    }
    
    // For POST/PUT/DELETE requests when offline, store for later sync
    if (['POST', 'PUT', 'DELETE'].includes(request.method)) {
      await storeOfflineAction(request);
      
      // Return a custom response indicating the action was queued
      return new Response(
        JSON.stringify({
          success: true,
          offline: true,
          message: 'Action queued for when connection is restored'
        }),
        {
          status: 202, // Accepted
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
    
    // Return offline page or error response
    return new Response(
      JSON.stringify({
        error: 'Network unavailable and no cached data found',
        offline: true
      }),
      {
        status: 503, // Service Unavailable
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

async function handleStaticRequest(request) {
  // Try cache first for static files
  const cachedResponse = await caches.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }
  
  // Try network
  try {
    const networkResponse = await fetch(request);
    
    // Cache the response if successful
    if (networkResponse.ok) {
      const cache = await caches.open(STATIC_CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    // Return offline fallback
    return new Response(
      '<html><body><h1>Offline</h1><p>Please check your connection.</p></body></html>',
      { headers: { 'Content-Type': 'text/html' } }
    );
  }
}

async function storeOfflineAction(request) {
  const action = {
    id: Date.now().toString(),
    url: request.url,
    method: request.method,
    headers: Object.fromEntries(request.headers.entries()),
    body: request.method !== 'GET' ? await request.text() : null,
    timestamp: Date.now()
  };
  
  // Store in IndexedDB
  const db = await openOfflineDB();
  const transaction = db.transaction(['offline_actions'], 'readwrite');
  const store = transaction.objectStore('offline_actions');
  await store.add(action);
  
  // Register for background sync
  if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
    await self.registration.sync.register('sync-time-records');
  }
}

async function syncTimeRecords() {
  console.log('Syncing offline actions...');
  
  const db = await openOfflineDB();
  const transaction = db.transaction(['offline_actions'], 'readwrite');
  const store = transaction.objectStore('offline_actions');
  const actions = await store.getAll();
  
  for (const action of actions) {
    try {
      const response = await fetch(action.url, {
        method: action.method,
        headers: action.headers,
        body: action.body
      });
      
      if (response.ok) {
        // Remove successful action from storage
        await store.delete(action.id);
        console.log('Synced action:', action.id);
      }
    } catch (error) {
      console.log('Failed to sync action:', action.id, error);
      // Keep the action for next sync attempt
    }
  }
}

async function openOfflineDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('TimeTrackerOffline', 1);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      
      // Create offline actions store
      if (!db.objectStoreNames.contains('offline_actions')) {
        const store = db.createObjectStore('offline_actions', { keyPath: 'id' });
        store.createIndex('timestamp', 'timestamp');
      }
      
      // Create cached data store
      if (!db.objectStoreNames.contains('cached_data')) {
        const store = db.createObjectStore('cached_data', { keyPath: 'key' });
        store.createIndex('timestamp', 'timestamp');
      }
    };
  });
}

async function getOfflineData() {
  const db = await openOfflineDB();
  const transaction = db.transaction(['offline_actions', 'cached_data'], 'readonly');
  
  const offlineActions = await transaction.objectStore('offline_actions').getAll();
  const cachedData = await transaction.objectStore('cached_data').getAll();
  
  return {
    pendingActions: offlineActions.length,
    lastSync: cachedData.find(item => item.key === 'lastSync')?.value || null,
    offlineActions,
    cachedData
  };
}

async function cacheApiResponse(url, responseData) {
  const db = await openOfflineDB();
  const transaction = db.transaction(['cached_data'], 'readwrite');
  const store = transaction.objectStore('cached_data');
  
  await store.put({
    key: url,
    value: responseData,
    timestamp: Date.now()
  });
}