// Loom Service Worker - PWA offline support
const CACHE_NAME = 'loom-v1.0.0';
const STATIC_CACHE = 'loom-static-v1.0.0';
const DATA_CACHE = 'loom-data-v1.0.0';

// Files to cache for offline shell
const STATIC_FILES = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  // Note: Do not include dev-only /src/* files here; hashed assets are cached at runtime
];

// API endpoints to cache
const DATA_URLS = [
  '/api/auth/me',
  '/api/events',
  '/api/proposals', 
  '/api/tasks',
  '/api/partner',
];

// Install event - cache static files
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker');
  
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('[SW] Caching static files');
        return cache.addAll(STATIC_FILES);
      })
      .then(() => {
        console.log('[SW] Static files cached');
        return self.skipWaiting();
      })
  );
});

// Activate event - cleanup old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((cacheName) => {
              return cacheName !== STATIC_CACHE && 
                     cacheName !== DATA_CACHE &&
                     cacheName !== CACHE_NAME;
            })
            .map((cacheName) => {
              console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            })
        );
      })
      .then(() => {
        console.log('[SW] Service worker activated');
        return self.clients.claim();
      })
  );
});

// Fetch event - serve from cache or network
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Handle API requests with network-first strategy
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Clone response for cache
          const responseClone = response.clone();

          // Only cache GET requests (POST, PUT, DELETE can't be cached)
          if (response.status === 200 && request.method === 'GET') {
            caches.open(DATA_CACHE)
              .then((cache) => {
                // Set cache expiry (7 days)
                const headers = new Headers(responseClone.headers);
                headers.set('sw-cache-timestamp', Date.now().toString());

                const cachedResponse = new Response(responseClone.body, {
                  status: responseClone.status,
                  statusText: responseClone.statusText,
                  headers: headers
                });

                cache.put(request, cachedResponse);
              });
          }

          return response;
        })
        .catch(() => {
          // Network failed, try cache
          return caches.open(DATA_CACHE)
            .then((cache) => {
              return cache.match(request)
                .then((cachedResponse) => {
                  if (cachedResponse) {
                    // Check if cache is still valid (7 days)
                    const cacheTimestamp = cachedResponse.headers.get('sw-cache-timestamp');
                    const cacheAge = Date.now() - parseInt(cacheTimestamp || '0');
                    const sevenDays = 7 * 24 * 60 * 60 * 1000;
                    
                    if (cacheAge < sevenDays) {
                      console.log('[SW] Serving cached API response:', request.url);
                      return cachedResponse;
                    } else {
                      // Cache expired, delete it
                      cache.delete(request);
                    }
                  }
                  
                  // Return offline fallback for API
                  return new Response(JSON.stringify({
                    error: 'Offline',
                    message: 'You are offline. Some features may not be available.'
                  }), {
                    status: 503,
                    headers: { 'Content-Type': 'application/json' }
                  });
                });
            });
        })
    );
    return;
  }

  // Handle static files with cache-first strategy
  event.respondWith(
    caches.match(request)
      .then((cachedResponse) => {
        if (cachedResponse) {
          console.log('[SW] Serving from cache:', request.url);
          return cachedResponse;
        }

        // Not in cache, fetch from network
        return fetch(request)
          .then((response) => {
            // Don't cache non-successful responses
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // Clone response for cache
            const responseClone = response.clone();

            // Cache the response
            caches.open(STATIC_CACHE)
              .then((cache) => {
                cache.put(request, responseClone);
              });

            return response;
          })
          .catch(() => {
            // Network failed and not in cache
            // Return offline fallback for navigation requests
            if (request.mode === 'navigate') {
              return caches.match('/index.html');
            }
            
            return new Response('Offline', { 
              status: 503, 
              statusText: 'Service Unavailable' 
            });
          });
      })
  );
});

// Background sync for when connection is restored
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync') {
    console.log('[SW] Background sync triggered');
    event.waitUntil(syncOfflineActions());
  }
});

// Push notifications
self.addEventListener('push', (event) => {
  if (event.data) {
    const data = event.data.json();
    
    const options = {
      body: data.body || '',
      icon: '/icons/loom-logo-192.png', // Use Loom branded icon
      badge: '/icons/loom-logo-144.png', // Use Loom branded badge
      tag: 'loom-notification',
      data: data.data || {},
      actions: [
        {
          action: 'view',
          title: 'View'
        },
        {
          action: 'dismiss',
          title: 'Dismiss'
        }
      ]
    };

    event.waitUntil(
      self.registration.showNotification(data.title || 'Loom Notification', options)
    );
  }
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  // Treat clicking the notification body the same as the 'view' action
  if (event.action === 'view' || !event.action) {
    const data = event.notification.data || {};
    let url = '/';

    if ((data.type === 'event_created' || data.type === 'chat_message' || data.type === 'checklist_item' || data.type === 'reminder') && data.event_id) {
      url = `/event/${data.event_id}`;
    } else if (data.type === 'proposal_created' || data.type === 'proposal_accepted' || data.type === 'proposal_declined') {
      url = '/proposals';
    }

    event.waitUntil(clients.openWindow(url));
  }
});

// IndexedDB helper functions for service worker
class SWIndexedDBManager {
  constructor() {
    this.dbName = 'loom-offline-db';
    this.version = 1;
  }

  async openDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains('offline-actions')) {
          const store = db.createObjectStore('offline-actions', { keyPath: 'id' });
          store.createIndex('timestamp', 'timestamp', { unique: false });
        }
      };
    });
  }

  async getOfflineActions() {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['offline-actions'], 'readonly');
      const store = transaction.objectStore('offline-actions');
      const index = store.index('timestamp');
      const request = index.openCursor();

      const actions = [];

      request.onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor) {
          actions.push(cursor.value);
          cursor.continue();
        } else {
          resolve(actions);
        }
      };

      request.onerror = () => reject(request.error);
    });
  }

  async removeOfflineAction(actionId) {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['offline-actions'], 'readwrite');
      const store = transaction.objectStore('offline-actions');
      const request = store.delete(actionId);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async updateOfflineAction(actionId, updates) {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['offline-actions'], 'readwrite');
      const store = transaction.objectStore('offline-actions');
      const getRequest = store.get(actionId);

      getRequest.onsuccess = () => {
        const action = getRequest.result;
        if (action) {
          const updatedAction = { ...action, ...updates };
          const putRequest = store.put(updatedAction);

          putRequest.onsuccess = () => resolve();
          putRequest.onerror = () => reject(putRequest.error);
        } else {
          reject(new Error('Action not found'));
        }
      };

      getRequest.onerror = () => reject(getRequest.error);
    });
  }
}

// Helper function to sync offline actions
async function syncOfflineActions() {
  console.log('[SW] Starting background sync of offline actions...');

  const dbManager = new SWIndexedDBManager();

  try {
    const actions = await dbManager.getOfflineActions();
    console.log(`[SW] Found ${actions.length} offline actions to sync`);

    if (actions.length === 0) {
      return;
    }

    // Process each action
    for (const action of actions) {
      try {
        console.log(`[SW] Processing action: ${action.type} for event ${action.eventId}`);

        // Attempt to sync the action
        const success = await attemptSyncAction(action);

        if (success) {
          await dbManager.removeOfflineAction(action.id);
          console.log(`[SW] Successfully synced action: ${action.id}`);
        } else {
          // Increment retry count
          if (action.retryCount < action.maxRetries) {
            await dbManager.updateOfflineAction(action.id, {
              retryCount: action.retryCount + 1
            });
            console.log(`[SW] Action ${action.id} failed, will retry (${action.retryCount + 1}/${action.maxRetries})`);
          } else {
            // Max retries reached, remove the action
            await dbManager.removeOfflineAction(action.id);
            console.log(`[SW] Action ${action.id} failed permanently after ${action.maxRetries} attempts`);
          }
        }
      } catch (error) {
        console.error(`[SW] Failed to process action ${action.id}:`, error);

        // Increment retry count on error
        if (action.retryCount < action.maxRetries) {
          await dbManager.updateOfflineAction(action.id, {
            retryCount: action.retryCount + 1
          });
        } else {
          await dbManager.removeOfflineAction(action.id);
        }
      }
    }

    console.log('[SW] Background sync completed');

  } catch (error) {
    console.error('[SW] Background sync failed:', error);
    throw error;
  }
}

// Attempt to sync a single action
async function attemptSyncAction(action) {
  const baseUrl = self.location.origin;
  const token = await getStoredAuthToken();

  if (!token) {
    console.warn('[SW] No auth token available for sync');
    return false;
  }

  try {
    let endpoint = '';
    let method = 'POST';
    let body = null;

    switch (action.type) {
      case 'send_message':
        endpoint = `/api/events/${action.eventId}/messages`;
        body = JSON.stringify({ message: action.data.message });
        break;

      case 'create_checklist_item':
        endpoint = `/api/events/${action.eventId}/checklist`;
        body = JSON.stringify(action.data);
        break;

      case 'update_checklist_item':
        endpoint = `/api/events/${action.eventId}/checklist/${action.data.itemId}`;
        method = 'PUT';
        body = JSON.stringify(action.data.updates);
        break;

      case 'delete_message':
        endpoint = `/api/events/${action.eventId}/messages/${action.data.messageId}`;
        method = 'DELETE';
        break;

      case 'delete_checklist_item':
        endpoint = `/api/events/${action.eventId}/checklist/${action.data.itemId}`;
        method = 'DELETE';
        break;

      default:
        console.warn(`[SW] Unknown action type: ${action.type}`);
        return false;
    }

    const response = await fetch(`${baseUrl}${endpoint}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body
    });

    if (response.ok) {
      return true;
    } else if (response.status === 404) {
      // Resource not found - this is expected for conflicts, consider it successful
      console.log(`[SW] Action ${action.type} returned 404, treating as successful (conflict resolved)`);
      return true;
    } else {
      console.warn(`[SW] Action failed with status: ${response.status}`);
      return false;
    }

  } catch (error) {
    console.error(`[SW] Network error syncing action:`, error);
    return false;
  }
}

// Get stored auth token from service worker context
async function getStoredAuthToken() {
  // Try to get token from various storage mechanisms
  // This is a simplified version - in practice you might need to communicate with the main thread

  try {
    // Check if we can access localStorage (limited in service workers)
    // For now, return null - the main app should handle token storage
    return null;
  } catch (error) {
    return null;
  }
}