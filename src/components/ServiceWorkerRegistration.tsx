'use client'

import { useEffect, useState, useRef } from 'react'
import UpdatePrompt from './UpdatePrompt'

/**
 * Service Worker Registration Component
 * 
 * Registers the service worker ONLY on safe pages (home page).
 * This prevents race conditions with auth redirects and ensures
 * the SW registers after the page has fully loaded.
 * 
 * Also checks for app updates by comparing installed version with server version.
 * Shows update prompt when a new version is available.
 * 
 * WHY: RootLayout runs for every request including redirects.
 * Registering SW there can cause race conditions with auth flows.
 */
export default function ServiceWorkerRegistration() {
  const [updateAvailable, setUpdateAvailable] = useState(false)
  const [isChecking, setIsChecking] = useState(false)
  const registrationRef = useRef<ServiceWorkerRegistration | null>(null)
  const checkIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // Check for updates by comparing versions
  const checkForUpdates = async () => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return
    if (isChecking) return // Prevent multiple simultaneous checks
    
    setIsChecking(true)
    
    try {
      // Get current version from server
      const response = await fetch('/api/version', { cache: 'no-store' })
      const serverData = await response.json()
      const serverVersion = serverData.version || '0.1.0'
      
      // Store server version in localStorage for comparison
      const storedVersion = localStorage.getItem('app_version')
      
      // If versions don't match, update is available
      if (storedVersion && storedVersion !== serverVersion) {
        console.log('Update available:', { storedVersion, serverVersion })
        setUpdateAvailable(true)
      } else {
        // Update stored version
        localStorage.setItem('app_version', serverVersion)
      }
      
      // Also check if service worker has an update waiting
      if (registrationRef.current?.waiting) {
        setUpdateAvailable(true)
      }
    } catch (error) {
      console.error('Error checking for updates:', error)
    } finally {
      setIsChecking(false)
    }
  }

  // Handle update
  const handleUpdate = async () => {
    try {
      // Get the latest version from server before updating
      const response = await fetch('/api/version', { cache: 'no-store' })
      const serverData = await response.json()
      const serverVersion = serverData.version || '0.1.0'
      
      if (registrationRef.current?.waiting) {
        // Tell the waiting service worker to skip waiting and become active
        registrationRef.current.waiting.postMessage({ type: 'SKIP_WAITING' })
        
        // Update stored version
        localStorage.setItem('app_version', serverVersion)
        
        // Reload the page after a short delay
        setTimeout(() => {
          window.location.reload()
        }, 100)
      } else {
        // If no waiting worker, just reload to get the latest version
        localStorage.setItem('app_version', serverVersion)
        window.location.reload()
      }
    } catch (error) {
      console.error('Error during update:', error)
      // Still try to reload
      window.location.reload()
    }
  }

  // Handle dismiss
  const handleDismiss = () => {
    setUpdateAvailable(false)
    // Check again in 5 minutes
    if (checkIntervalRef.current) {
      clearInterval(checkIntervalRef.current)
    }
    checkIntervalRef.current = setInterval(checkForUpdates, 5 * 60 * 1000)
  }

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
            registrationRef.current = registration
            
            // Check for updates immediately after registration
            setTimeout(() => {
              checkForUpdates()
            }, 2000)
            
            // Check for updates when service worker updates
            registration.addEventListener('updatefound', () => {
              console.log('Service worker update found')
              const newWorker = registration.installing
              
              if (newWorker) {
                newWorker.addEventListener('statechange', () => {
                  if (newWorker.state === 'installed') {
                    if (navigator.serviceWorker.controller) {
                      // New service worker is installed and waiting
                      console.log('New service worker installed, update available')
                      setUpdateAvailable(true)
                    } else {
                      // First time installation, no update needed
                      console.log('Service worker installed for the first time')
                    }
                  }
                })
              }
            })
            
            // Also check if there's already a waiting service worker
            if (registration.waiting) {
              console.log('Service worker waiting, update available')
              setUpdateAvailable(true)
            }
            
            // Periodically check for updates (every 5 minutes)
            checkIntervalRef.current = setInterval(() => {
              checkForUpdates()
              // Also manually check for service worker updates
              registration.update()
            }, 5 * 60 * 1000)
          })
          .catch((err) => {
            // Silently fail - SW is optional for PWA functionality
            console.log('ServiceWorker registration failed:', err)
          })
      }
    }, 1000) // 1 second delay to avoid race conditions

    return () => {
      clearTimeout(timeoutId)
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current)
      }
    }
  }, [])

  return (
    <>
      {updateAvailable && (
        <UpdatePrompt onUpdate={handleUpdate} onDismiss={handleDismiss} />
      )}
    </>
  )
}

