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
      className="fixed bottom-0 left-0 right-0 z-50 bg-indigo-900 text-white px-4 py-4 shadow-soft-md"
    >
      <div className="max-w-4xl mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <p className="text-sm text-white/80">
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
          className="shrink-0 px-5 py-2.5 bg-accent text-white text-sm font-medium rounded-full hover:bg-accent-hover transition-colors duration-fast focus:outline-none focus:shadow-[var(--focus-ring)]"
        >
          Accept
        </button>
      </div>
    </div>
  )
}
