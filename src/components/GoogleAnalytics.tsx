'use client'

import { useEffect } from 'react'

const COOKIE_CONSENT_KEY = 'cookie_consent'
const COOKIE_CONSENT_ACCEPTED = 'accepted'

declare global {
  interface Window {
    dataLayer?: unknown[]
    gtag?: (...args: unknown[]) => void
  }
}

/**
 * Loads Google Analytics (gtag) only when:
 * - Admin has set a GA Measurement ID in site settings, and
 * - The user has accepted cookies (cookie_consent === 'accepted').
 * Renders nothing; injects script and config from the client.
 */
export default function GoogleAnalytics() {
  useEffect(() => {
    if (typeof window === 'undefined') return
    const consent = localStorage.getItem(COOKIE_CONSENT_KEY)
    if (consent !== COOKIE_CONSENT_ACCEPTED) return

    fetch('/api/site-meta', { cache: 'no-store' })
      .then((res) => res.json())
      .then((data: { gaMeasurementId?: string | null }) => {
        const id = data?.gaMeasurementId
        if (!id || typeof id !== 'string') return

        window.dataLayer = window.dataLayer || []
        const gtag = (...args: unknown[]) => window.dataLayer?.push(args)
        window.gtag = gtag
        gtag('js', new Date())
        gtag('config', id)

        const script = document.createElement('script')
        script.async = true
        script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`
        document.head.appendChild(script)
      })
      .catch(() => {})
  }, [])

  return null
}
