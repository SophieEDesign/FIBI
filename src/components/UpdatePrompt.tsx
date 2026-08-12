'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'

interface UpdatePromptProps {
  onUpdate: () => void
  onDismiss: () => void
}

/**
 * Shows when a new version of the app is available.
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
      <div className="bg-indigo-900 text-white rounded-2xl shadow-soft-md p-4 border border-indigo-700">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <h3 className="font-semibold text-sm mb-1">Update available</h3>
            <p className="text-xs text-white/70 mb-3">
              A new version of FIBI is ready. Update when you have a moment.
            </p>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleUpdate}>
                Update now
              </Button>
              <Button size="sm" variant="ghost" className="text-white hover:bg-white/10" onClick={handleDismiss}>
                Later
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
