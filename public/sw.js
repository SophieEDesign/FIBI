const CACHE_NAME = 'fibi-v2'
const urlsToCache = [
  '/manifest.json',
  '/icon.svg'
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
  const url = new URL(event.request.url)
  
  // CRITICAL: Don't intercept navigation requests (HTML pages) - let them go through normally
  // This prevents service worker from interfering with redirects and auth flows
  if (event.request.mode === 'navigate' || event.request.destination === 'document') {
    return
  }
  
  // Don't intercept requests with redirect mode that's not 'follow'
  if (event.request.redirect !== 'follow') {
    return
  }

  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return
  }

  // Skip API routes, auth routes, and service worker itself
  if (
    url.pathname.startsWith('/api') || 
    url.pathname.startsWith('/auth') ||
    url.pathname === '/sw.js' ||
    url.pathname === '/manifest.json'
  ) {
    return
  }

  // Only cache static assets (images, CSS, JS, fonts, etc.)
  if (
    !url.pathname.match(/\.(jpg|jpeg|png|gif|svg|css|js|woff|woff2|ttf|eot|ico)$/i)
  ) {
    return
  }

  // Cache static assets only
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

          // Only cache successful GET requests for static assets
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
          // If fetch fails, try to return from cache
          return caches.match(event.request).catch(() => {
            // If cache match also fails, return network error
            throw error
          })
        })
      })
      .catch(() => {
        // If cache match fails, try network
        return fetch(event.request).catch(() => {
          // If both fail, return error response
          return new Response('Network error', { status: 503 })
        })
      })
  )
})
