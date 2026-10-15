'use client'

import { useState } from 'react'
import { usePWAInstall } from '@/hooks/usePWAInstall'

export default function InstallOnPhone() {
  const [showHelp, setShowHelp] = useState(false)
  const { isInstalled, promptInstall, hasPrompt } = usePWAInstall()

  if (isInstalled) return null

  const handleInstall = async () => {
    if (hasPrompt) {
      try {
        const accepted = await promptInstall()
        if (!accepted) setShowHelp(true)
      } catch {
        setShowHelp(true)
      }
      return
    }
    setShowHelp(true)
  }

  return (
    <>
      <button
        type="button"
        onClick={handleInstall}
        className="w-full text-left px-4 py-3 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"
      >
        <div className="font-medium text-gray-900">Install Fibi on this phone</div>
        <div className="text-xs text-gray-500 mt-0.5">Add it to your home screen</div>
      </button>

      {showHelp && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Install Fibi</h3>
            <p className="text-sm text-gray-600 mb-4">To keep Fibi on your phone:</p>
            <div className="text-sm text-gray-700 space-y-3 mb-4">
              <div>
                <p className="font-medium mb-1">Android (Chrome)</p>
                <ol className="list-decimal list-inside space-y-1 ml-2">
                  <li>Tap the menu in the top right</li>
                  <li>Choose Add to Home screen, or Install app</li>
                  <li>Confirm</li>
                </ol>
              </div>
              <div>
                <p className="font-medium mb-1">iPhone (Safari)</p>
                <ol className="list-decimal list-inside space-y-1 ml-2">
                  <li>Tap Share at the bottom</li>
                  <li>Scroll down and tap Add to Home Screen</li>
                  <li>Tap Add</li>
                </ol>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowHelp(false)}
              className="w-full bg-accent text-white py-2 px-4 rounded-full font-medium hover:bg-accent-hover transition-colors"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </>
  )
}
