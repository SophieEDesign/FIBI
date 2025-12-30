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

  // Don't cache redirect responses
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        if (response) {
          return response
        }
        
        // Fetch from network
        return fetch(event.request).then((networkResponse) => {
          // Don't cache redirects (status 3xx)
          if (networkResponse.status >= 300 && networkResponse.status < 400) {
            return networkResponse
          }

          // Only cache successful GET requests
          if (event.request.method === 'GET' && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone()
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache)
            })
          }

          return networkResponse
        })
      })
      .catch(() => {
        // If both fail, return offline page if available
        if (event.request.destination === 'document') {
          return caches.match('/')
        }
      })
  )
})

