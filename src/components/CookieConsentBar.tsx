'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

const STORAGE_KEY = 'cookie_consent'

export default function CookieConsentBar() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const consent = localStorage.getItem(STORAGE_KEY)
    if (consent !== 'accepted') {
      setVisible(true)
    }
  }, [])

  const accept = () => {
    if (typeof window === 'undefined') return
    localStorage.setItem(STORAGE_KEY, 'accepted')
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div
      role="dialog"
      aria-label="Cookie consent"
      className="fixed bottom-0 left-0 right-0 z-50 bg-[#171717] text-white px-4 py-4 shadow-[0_-4px_20px_rgba(0,0,0,0.15)]"
    >
      <div className="max-w-4xl mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <p className="text-sm text-gray-200">
          We use cookies and local storage to keep you signed in and to remember your preferences.
          We do not use advertising or tracking cookies. See our{' '}
          <Link href="/privacy" className="underline hover:no-underline text-white font-medium">
            Privacy Policy
          </Link>{' '}
          for details.
        </p>
        <button
          type="button"
          onClick={accept}
          className="shrink-0 px-5 py-2.5 bg-white text-[#171717] text-sm font-medium rounded-lg hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-[#171717]"
        >
          Accept
        </button>
      </div>
    </div>
  )
}
