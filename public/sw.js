const CACHE_NAME = 'fibi-v1'
const urlsToCache = [
  '/',
  '/add',
  '/login',
  '/manifest.json'
]

// Install event - cache resources
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(urlsToCache)
      })
      .catch((err) => {
        console.error('Cache install failed:', err)
      })
  )
  self.skipWaiting()
})

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName)
          }
        })
      )
    })
  )
  return self.clients.claim()
})

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  // Don't intercept requests with redirect mode that's not 'follow'
  if (event.request.redirect !== 'follow') {
    return
  }

  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return
  }

  // Don't cache redirect responses
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        if (response) {
          return response
        }
        
        // Fetch from network
        return fetch(event.request).then((networkResponse) => {
          // Don't cache redirects (status 3xx) or errors
          if (networkResponse.status >= 300 && networkResponse.status < 400) {
            return networkResponse
          }

          // Only cache successful GET requests
          if (networkResponse.status === 200 && networkResponse.type === 'basic') {
            const responseToCache = networkResponse.clone()
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache).catch(() => {
                // Ignore cache errors
              })
            }).catch(() => {
              // Ignore cache open errors
            })
          }

          return networkResponse
        }).catch((error) => {
          // If fetch fails, return offline page if available for document requests
          if (event.request.destination === 'document') {
            return caches.match('/').catch(() => {
              // If cache match also fails, return a basic error response
              return new Response('Offline', { status: 503 })
            })
          }
          throw error
        })
      })
      .catch(() => {
        // If cache match fails, try network
        return fetch(event.request).catch(() => {
          // If both fail, return offline page if available
          if (event.request.destination === 'document') {
            return caches.match('/').catch(() => {
              return new Response('Offline', { status: 503 })
            })
          }
          return new Response('Network error', { status: 503 })
        })
      })
  )
})

