'use client'

import { useState, useEffect } from 'react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

/**
 * PWA Install Hook
 * 
 * Detects PWA installability and handles the install prompt.
 * 
 * HOW IT WORKS:
 * - Listens for 'beforeinstallprompt' event (fired by browser when PWA is installable)
 * - Detects if app is already installed (standalone mode or display-mode: standalone)
 * - Provides function to trigger install prompt
 * - Handles cases where event is not available gracefully
 */
export function usePWAInstall() {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [isInstalled, setIsInstalled] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    // Detect mobile device
    const checkMobile = () => {
      const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent
      ) || window.matchMedia('(max-width: 768px)').matches
      setIsMobile(isMobileDevice)
    }
    
    checkMobile()
    window.addEventListener('resize', checkMobile)

    // Detect if app is already installed
    const checkInstalled = () => {
      // Check if running in standalone mode (installed PWA)
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches
      // Check if navigator.standalone is true (iOS Safari)
      const isIOSStandalone = (window.navigator as any).standalone === true
      setIsInstalled(isStandalone || isIOSStandalone)
    }
    
    checkInstalled()

    // Listen for beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      // Prevent the default mini-infobar
      e.preventDefault()
      // Store the event for later use
      setInstallPrompt(e as BeforeInstallPromptEvent)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)

    // Listen for app installed event
    window.addEventListener('appinstalled', () => {
      setIsInstalled(true)
      setInstallPrompt(null)
    })

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('resize', checkMobile)
    }
  }, [])

  /**
   * Trigger the install prompt
   * @returns Promise that resolves when user makes a choice
   */
  const promptInstall = async (): Promise<boolean> => {
    if (!installPrompt) {
      return false
    }

    try {
      // Show the install prompt
      await installPrompt.prompt()
      
      // Wait for user's response
      const { outcome } = await installPrompt.userChoice
      
      // Clear the prompt (can only be used once)
      setInstallPrompt(null)
      
      return outcome === 'accepted'
    } catch (error) {
      console.error('Error showing install prompt:', error)
      return false
    }
  }

  return {
    isInstallable: installPrompt !== null && !isInstalled,
    isInstalled,
    isMobile,
    promptInstall,
    hasPrompt: installPrompt !== null,
  }
}

