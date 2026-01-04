'use client'

import { useState, useRef, useEffect } from 'react'
import { usePWAInstall } from '@/hooks/usePWAInstall'
import Link from 'next/link'

interface MobileMenuProps {
  isAuthenticated: boolean
  onSignOut: () => void
}

/**
 * Mobile Menu Component
 * 
 * Overflow menu for mobile devices with PWA install option.
 * Only visible on mobile screens.
 */
export default function MobileMenu({ isAuthenticated, onSignOut }: MobileMenuProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [showInstallHelp, setShowInstallHelp] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const { isInstallable, isInstalled, isMobile, promptInstall, hasPrompt } = usePWAInstall()
  
  // Debug logging
  useEffect(() => {
    console.log('MobileMenu - Install state:', {
      isInstalled,
      isInstallable,
      hasPrompt,
      isMobile,
    })
  }, [isInstalled, isInstallable, hasPrompt, isMobile])

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('touchstart', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('touchstart', handleClickOutside)
    }
  }, [isOpen])

  const handleInstall = async () => {
    setIsOpen(false)
    
    if (hasPrompt) {
      try {
        const accepted = await promptInstall()
        if (!accepted) {
          // User dismissed the prompt, show help as fallback
          setShowInstallHelp(true)
        }
      } catch (error) {
        console.error('Error triggering install:', error)
        // Show help if prompt fails
        setShowInstallHelp(true)
      }
    } else {
      // Show help modal with device-specific instructions
      setShowInstallHelp(true)
    }
  }

  // Only show on mobile
  if (!isMobile) {
    return null
  }

  return (
    <>
      {/* Hamburger Menu Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="md:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
        aria-label="Menu"
      >
        <svg
          className="w-6 h-6 text-gray-900"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          {isOpen ? (
            <path d="M6 18L18 6M6 6l12 12" />
          ) : (
            <path d="M4 6h16M4 12h16M4 18h16" />
          )}
        </svg>
      </button>

      {/* Menu Dropdown */}
      {isOpen && (
        <div
          ref={menuRef}
          className="absolute right-4 top-16 bg-white rounded-lg shadow-lg border border-gray-200 py-2 min-w-[200px] z-50 md:hidden"
        >
          {isAuthenticated ? (
            <>
              <Link
                href="/app/map"
                onClick={() => setIsOpen(false)}
                className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Map
              </Link>
              <Link
                href="/app/calendar"
                onClick={() => setIsOpen(false)}
                className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Planner
              </Link>
              <Link
                href="/app/add"
                onClick={() => setIsOpen(false)}
                className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Add Place
              </Link>
              {!isInstalled && (
                <button
                  onClick={handleInstall}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors border-t border-gray-200"
                >
                  Install app
                </button>
              )}
              <button
                onClick={() => {
                  onSignOut()
                  setIsOpen(false)
                }}
                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors border-t border-gray-200"
              >
                Sign out
              </button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                onClick={() => setIsOpen(false)}
                className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Sign in
              </Link>
              {!isInstalled && (
                <button
                  onClick={handleInstall}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors border-t border-gray-200"
                >
                  Install app
                </button>
              )}
            </>
          )}
        </div>
      )}

      {/* Install Help Modal */}
      {showInstallHelp && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Install FiBi</h3>
            <p className="text-sm text-gray-600 mb-4">
              To install FiBi on your phone:
            </p>
            <div className="text-sm text-gray-700 space-y-3 mb-4">
              <div>
                <p className="font-medium mb-1">Android (Chrome):</p>
                <ol className="list-decimal list-inside space-y-1 ml-2">
                  <li>Tap the menu (⋮) in the top right</li>
                  <li>Look for &quot;Add to Home screen&quot; or &quot;Install app&quot;</li>
                  <li>If you see &quot;Add shortcut&quot;, that&apos;s also the install option</li>
                  <li>Tap it and follow the prompts</li>
                </ol>
                <p className="text-xs text-gray-500 mt-2 italic">
                  Note: &quot;Add to Home screen&quot; installs FiBi as an app
                </p>
              </div>
              <div>
                <p className="font-medium mb-1">iPhone (Safari):</p>
                <ol className="list-decimal list-inside space-y-1 ml-2">
                  <li>Tap the Share button (□↑) at the bottom</li>
                  <li>Scroll down and tap &quot;Add to Home Screen&quot;</li>
                  <li>Tap &quot;Add&quot; to confirm</li>
                </ol>
              </div>
            </div>
            <button
              onClick={() => setShowInstallHelp(false)}
              className="w-full bg-gray-900 text-white py-2 px-4 rounded-lg font-medium hover:bg-gray-800 transition-colors"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </>
  )
}

