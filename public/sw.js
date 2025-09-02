// Loom Service Worker - PWA offline support
const CACHE_NAME = 'loom-v1.0.0';
const STATIC_CACHE = 'loom-static-v1.0.0';
const DATA_CACHE = 'loom-data-v1.0.0';

// Files to cache for offline shell
const STATIC_FILES = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/src/main.tsx',
  '/src/index.css',
  // Add other critical static assets
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

// Push notifications (for future feature)
self.addEventListener('push', (event) => {
  if (event.data) {
    const data = event.data.json();
    
    const options = {
      body: data.body,
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-96x96.png',
      tag: 'loom-notification',
      data: data.data,
      actions: [
        {
          action: 'view',
          title: 'View Event'
        },
        {
          action: 'dismiss',
          title: 'Dismiss'
        }
      ]
    };

    event.waitUntil(
      self.registration.showNotification(data.title, options)
    );
  }
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'view') {
    // Open the app to the relevant event
    event.waitUntil(
      clients.openWindow(`/event/${event.notification.data?.eventId || ''}`)
    );
  }
});

// Helper function to sync offline actions
async function syncOfflineActions() {
  try {
    // Get any pending offline actions from IndexedDB
    // and sync them when connection is restored
    console.log('[SW] Syncing offline actions...');
    
    // This would integrate with your app's offline queue
    // For now, just log that sync is available
    
    return Promise.resolve();
  } catch (error) {
    console.error('[SW] Background sync failed:', error);
    throw error;
  }
}