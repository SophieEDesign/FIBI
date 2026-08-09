'use client'

import { useEffect, useState } from 'react'
import { getAdminAuthHeaders } from '@/lib/admin-auth-headers'

const GA_PATTERN = /^G-[A-Z0-9]+$/i

export default function AdminSettingsClient() {
  const [emailFooterAddress, setEmailFooterAddress] = useState('')
  const [gaMeasurementId, setGaMeasurementId] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [lastChange, setLastChange] = useState<{
    created_at: string
    actor_email?: string | null
  } | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const headers = await getAdminAuthHeaders()
        const res = await fetch('/api/admin/site-settings', { credentials: 'include', headers })
        if (!res.ok) return
        const json = await res.json()
        if (cancelled) return
        if (typeof json.email_footer_address === 'string') setEmailFooterAddress(json.email_footer_address)
        if (typeof json.ga_measurement_id === 'string') setGaMeasurementId(json.ga_measurement_id)
        if (json.last_change) setLastChange(json.last_change)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const save = async () => {
    setMessage(null)
    const ga = gaMeasurementId.trim()
    if (ga && !GA_PATTERN.test(ga)) {
      setMessage({ type: 'error', text: 'GA ID must be blank or look like G-XXXXXXXXXX.' })
      return
    }
    setSaving(true)
    try {
      const headers = await getAdminAuthHeaders()
      const res = await fetch('/api/admin/site-settings', {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify({
          email_footer_address: emailFooterAddress,
          ga_measurement_id: ga,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setMessage({ type: 'error', text: data.error || "That didn't work. Try again." })
        return
      }
      setMessage({ type: 'success', text: 'Settings saved.' })
      if (data.last_change) setLastChange(data.last_change)
      setTimeout(() => setMessage(null), 4000)
    } catch {
      setMessage({ type: 'error', text: "That didn't work. Try again." })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-[#8A857A]">Loading…</div>
    )
  }

  return (
    <div className="px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-xl">
        <h1 className="text-2xl font-semibold text-[#17181A]">Settings</h1>
        <p className="mt-1 text-sm text-[#5C574C]">
          Set once. Off the daily path.
        </p>

        <div className="mt-8 space-y-5 rounded-[14px] border border-[#E5E5E5] bg-white p-6 shadow-[0_1px_2px_rgba(26,26,24,0.06),0_8px_24px_rgba(46,70,120,0.08)]">
          <div>
            <label className="block text-sm font-medium text-[#17181A]" htmlFor="ga">
              Google Analytics measurement ID
            </label>
            <p className="mt-1 text-xs text-[#8A857A]">
              Leave blank to disable. Loads only for visitors who accepted cookies.
            </p>
            <input
              id="ga"
              type="text"
              value={gaMeasurementId}
              onChange={(e) => setGaMeasurementId(e.target.value)}
              placeholder="G-XXXXXXXXXX"
              className="mt-2 w-full rounded-full border border-[#E5E5E5] px-4 py-2 text-sm focus:border-[#2E9EE8] focus:outline-none focus:ring-2 focus:ring-[#2E9EE8]/30"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#17181A]" htmlFor="footer">
              Email footer address
            </label>
            <p className="mt-1 text-xs text-[#8A857A]">
              Physical address shown at the bottom of emails (CAN-SPAM).
            </p>
            <input
              id="footer"
              type="text"
              value={emailFooterAddress}
              onChange={(e) => setEmailFooterAddress(e.target.value)}
              placeholder="e.g. FIBI, 123 Street, City, Country"
              className="mt-2 w-full rounded-full border border-[#E5E5E5] px-4 py-2 text-sm focus:border-[#2E9EE8] focus:outline-none focus:ring-2 focus:ring-[#2E9EE8]/30"
            />
          </div>
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="rounded-full bg-[#2E9EE8] px-4 py-2 text-sm font-medium text-white transition-opacity duration-[130ms] hover:opacity-90 disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save settings'}
          </button>
          {message && (
            <p
              className={`text-sm ${message.type === 'success' ? 'text-[#1E6B48]' : 'text-[#9C3226]'}`}
              role="alert"
            >
              {message.text}
            </p>
          )}
          {lastChange && (
            <p className="text-xs text-[#8A857A]">
              Last changed {new Date(lastChange.created_at).toLocaleString('en-GB')}
              {lastChange.actor_email ? ` by ${lastChange.actor_email}` : ''}.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
