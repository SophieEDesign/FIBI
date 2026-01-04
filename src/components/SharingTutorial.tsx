'use client'

import { useState, useEffect } from 'react'
import { usePWAInstall } from '@/hooks/usePWAInstall'

const TUTORIAL_SHOWN_KEY = 'fibi-sharing-tutorial-shown'

/**
 * Sharing Tutorial Component
 * 
 * Shows a tutorial modal when the app is first opened after installation.
 * Uses localStorage to track if tutorial has been shown.
 * Only shows if app is installed as PWA (standalone mode).
 */
export default function SharingTutorial() {
  const [showTutorial, setShowTutorial] = useState(false)
  const { isInstalled } = usePWAInstall()

  useEffect(() => {
    // Only show tutorial if:
    // 1. App is installed (running in standalone mode)
    // 2. Tutorial hasn't been shown before
    // 3. We're in a browser environment
    if (typeof window === 'undefined') return

    const hasShownTutorial = localStorage.getItem(TUTORIAL_SHOWN_KEY) === 'true'
    
    if (isInstalled && !hasShownTutorial) {
      // Small delay to ensure page is fully loaded
      const timer = setTimeout(() => {
        setShowTutorial(true)
      }, 500)
      
      return () => clearTimeout(timer)
    }
  }, [isInstalled])

  const handleDismiss = () => {
    setShowTutorial(false)
    localStorage.setItem(TUTORIAL_SHOWN_KEY, 'true')
  }

  if (!showTutorial) {
    return null
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between mb-4">
          <h2 className="text-2xl font-bold text-gray-900">
            Welcome to Fibi!
          </h2>
          <button
            onClick={handleDismiss}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Close tutorial"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-6">
          <p className="text-gray-600">
            Now that Fibi is installed, you can share places directly from TikTok, Instagram, YouTube, and other apps — no copy-paste needed!
          </p>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">
              How to share to Fibi:
            </h3>

            <div className="space-y-3">
              <div className="flex gap-3">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-gray-900 text-white flex items-center justify-center text-sm font-semibold">
                  1
                </div>
                <div>
                  <p className="text-gray-700 font-medium">Find something to save</p>
                  <p className="text-sm text-gray-500">Open TikTok, Instagram, or any app with a post/video you want to save</p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-gray-900 text-white flex items-center justify-center text-sm font-semibold">
                  2
                </div>
                <div>
                  <p className="text-gray-700 font-medium">Tap the Share button</p>
                  <p className="text-sm text-gray-500">Look for the share icon (usually → or Share) on the post/video</p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-gray-900 text-white flex items-center justify-center text-sm font-semibold">
                  3
                </div>
                <div>
                  <p className="text-gray-700 font-medium">Select Fibi from the Share Sheet</p>
                  <p className="text-sm text-gray-500">Fibi will appear alongside other apps like Messages, WhatsApp, etc.</p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-gray-900 text-white flex items-center justify-center text-sm font-semibold">
                  4
                </div>
                <div>
                  <p className="text-gray-700 font-medium">Review and save</p>
                  <p className="text-sm text-gray-500">Fibi opens with the link automatically loaded. Add any details you want, then save!</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-4 space-y-2">
            <p className="text-sm font-semibold text-gray-900">✨ Direct Share</p>
            <p className="text-sm text-gray-600">
              When you share to Fibi, the link is sent directly — no need to copy and paste. The URL is automatically captured and loaded into Fibi.
            </p>
          </div>

          <button
            onClick={handleDismiss}
            className="w-full bg-gray-900 text-white py-3 px-4 rounded-lg font-medium hover:bg-gray-800 transition-colors"
          >
            Got it, let&apos;s go!
          </button>
        </div>
      </div>
    </div>
  )
}

