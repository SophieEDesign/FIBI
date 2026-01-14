// Get version from API and set cache name
let CACHE_NAME = 'fibi-v1'
let APP_VERSION = '0.1.0'

// Fetch version on service worker startup
async function getAppVersion() {
  try {
    const response = await fetch('/api/version', { cache: 'no-store' })
    const data = await response.json()
    APP_VERSION = data.version || '0.1.0'
    CACHE_NAME = `fibi-v${APP_VERSION.replace(/\./g, '-')}`
    return APP_VERSION
  } catch (error) {
    console.error('Failed to fetch version:', error)
    return APP_VERSION
  }
}

const urlsToCache = [
  '/manifest.json',
  '/icon.svg'
]

// Install event - cache resources
self.addEventListener('install', (event) => {
  // Use waitUntil to keep the event alive
  event.waitUntil(
    (async () => {
      // Fetch version before installing
      await getAppVersion()
      
      try {
        const cache = await caches.open(CACHE_NAME)
        await cache.addAll(urlsToCache)
      } catch (err) {
        console.error('Cache install failed:', err)
      }
    })()
  )
  self.skipWaiting()
})

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  // Use waitUntil to keep the event alive
  event.waitUntil(
    (async () => {
      // Ensure we have the latest version
      await getAppVersion()
      
      const cacheNames = await caches.keys()
      await Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME && cacheName.startsWith('fibi-')) {
            console.log('Deleting old cache:', cacheName)
            return caches.delete(cacheName)
          }
        })
      )
      // Notify all clients that service worker is ready
      await self.clients.claim()
    })()
  )
})

// Listen for messages from clients
self.addEventListener('message', async (event) => {
  if (event.data && event.data.type === 'CHECK_VERSION') {
    // Fetch latest version from server
    const latestVersion = await getAppVersion()
    
    // Send version back to client if port exists
    if (event.ports && event.ports[0]) {
      event.ports[0].postMessage({
        type: 'VERSION_RESPONSE',
        version: latestVersion,
        cacheName: CACHE_NAME
      })
    }
  }
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
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

  // CRITICAL: Don't intercept external domain requests (CDNs, third-party services)
  // External domains often have CORS restrictions and don't allow service worker caching
  // This prevents 403 errors from Facebook CDN, Instagram CDN, etc.
  if (url.origin !== self.location.origin) {
    return
  }

  // Skip API routes, auth routes, and service worker itself
  // Always bypass cache for version endpoint to get latest version
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
