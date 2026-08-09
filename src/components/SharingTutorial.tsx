'use client'

import { useState, useEffect } from 'react'
import { usePWAInstall } from '@/hooks/usePWAInstall'

const TUTORIAL_SHOWN_KEY = 'fibi-sharing-tutorial-shown'

/**
 * Sharing Tutorial — shown once after PWA install.
 */
export default function SharingTutorial() {
  const [showTutorial, setShowTutorial] = useState(false)
  const { isInstalled } = usePWAInstall()

  useEffect(() => {
    if (typeof window === 'undefined') return

    const hasShownTutorial = localStorage.getItem(TUTORIAL_SHOWN_KEY) === 'true'

    if (isInstalled && !hasShownTutorial) {
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
            Welcome to FIBI
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
            FIBI is on your home screen. Share a place from TikTok or Instagram and it lands here — no copy-paste.
          </p>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">
              How to share
            </h3>

            <div className="space-y-3">
              <div className="flex gap-3">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-accent text-white flex items-center justify-center text-sm font-semibold">
                  1
                </div>
                <div>
                  <p className="text-gray-700 font-medium">Find something to save</p>
                  <p className="text-sm text-gray-500">Open TikTok, Instagram, or any app with a place you like</p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-accent text-white flex items-center justify-center text-sm font-semibold">
                  2
                </div>
                <div>
                  <p className="text-gray-700 font-medium">Tap Share</p>
                  <p className="text-sm text-gray-500">Use the share icon on the post or video</p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-accent text-white flex items-center justify-center text-sm font-semibold">
                  3
                </div>
                <div>
                  <p className="text-gray-700 font-medium">Select FIBI</p>
                  <p className="text-sm text-gray-500">It appears in your share sheet with your other apps</p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-accent text-white flex items-center justify-center text-sm font-semibold">
                  4
                </div>
                <div>
                  <p className="text-gray-700 font-medium">Done</p>
                  <p className="text-sm text-gray-500">We save it for you. Add details later if you want.</p>
                </div>
              </div>
            </div>
          </div>

          <button
            onClick={handleDismiss}
            className="w-full bg-accent text-white py-3 px-4 rounded-full font-medium hover:bg-accent-hover transition-colors"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  )
}
