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
  const { isInstallable, isMobile, promptInstall, hasPrompt } = usePWAInstall()

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
    if (hasPrompt) {
      const accepted = await promptInstall()
      if (accepted) {
        setIsOpen(false)
      }
    } else {
      // Show help modal if prompt is not available
      setShowInstallHelp(true)
      setIsOpen(false)
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
                href="/add"
                onClick={() => setIsOpen(false)}
                className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Add Place
              </Link>
              {isInstallable && (
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
              {isInstallable && (
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
            <h3 className="text-lg font-bold text-gray-900 mb-2">Install Fibi</h3>
            <p className="text-sm text-gray-600 mb-4">
              To install Fibi on your phone:
            </p>
            <ol className="text-sm text-gray-700 space-y-2 mb-4 list-decimal list-inside">
              <li>Open your browser menu (⋮)</li>
              <li>Tap &quot;Install app&quot; or &quot;Add to Home screen&quot;</li>
              <li>Follow the prompts to install</li>
            </ol>
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

