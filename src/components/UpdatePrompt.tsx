'use client'

import { useState, useEffect } from 'react'

interface UpdatePromptProps {
  onUpdate: () => void
  onDismiss: () => void
}

/**
 * Update Prompt Component
 * 
 * Shows a notification when a new version of the app is available.
 * Allows users to update immediately or dismiss the notification.
 */
export default function UpdatePrompt({ onUpdate, onDismiss }: UpdatePromptProps) {
  const [isVisible, setIsVisible] = useState(true)

  const handleUpdate = () => {
    setIsVisible(false)
    onUpdate()
  }

  const handleDismiss = () => {
    setIsVisible(false)
    onDismiss()
  }

  if (!isVisible) return null

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 md:left-auto md:right-4 md:w-96">
      <div className="bg-gray-900 text-white rounded-lg shadow-lg p-4 border border-gray-800">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <h3 className="font-semibold text-sm mb-1">Update Available</h3>
            <p className="text-xs text-gray-300 mb-3">
              A new version of FiBi is available. Update now to get the latest features and improvements.
            </p>
            <div className="flex gap-2">
              <button
                onClick={handleUpdate}
                className="px-4 py-2 bg-white text-gray-900 rounded text-sm font-medium hover:bg-gray-100 transition-colors"
              >
                Update Now
              </button>
              <button
                onClick={handleDismiss}
                className="px-4 py-2 bg-gray-800 text-white rounded text-sm font-medium hover:bg-gray-700 transition-colors"
              >
                Later
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}


