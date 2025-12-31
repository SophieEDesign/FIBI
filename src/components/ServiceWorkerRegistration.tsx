'use client'

import { useEffect } from 'react'

/**
 * Service Worker Registration Component
 * 
 * Registers the service worker ONLY on safe pages (home page).
 * This prevents race conditions with auth redirects and ensures
 * the SW registers after the page has fully loaded.
 * 
 * WHY: RootLayout runs for every request including redirects.
 * Registering SW there can cause race conditions with auth flows.
 */
export default function ServiceWorkerRegistration() {
  useEffect(() => {
    // Only register on client side, after component mounts
    if (typeof window === 'undefined') return
    
    // Wait a bit to ensure page is stable (no immediate redirects)
    const timeoutId = setTimeout(() => {
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker
          .register('/sw.js', { scope: '/' })
          .then((registration) => {
            console.log('ServiceWorker registration successful:', registration.scope)
          })
          .catch((err) => {
            // Silently fail - SW is optional for PWA functionality
            console.log('ServiceWorker registration failed:', err)
          })
      }
    }, 1000) // 1 second delay to avoid race conditions

    return () => clearTimeout(timeoutId)
  }, [])

  return null
}

