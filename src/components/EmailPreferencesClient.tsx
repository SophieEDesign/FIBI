'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/useAuth'
import { createClient } from '@/lib/supabase/client'

export default function EmailPreferencesClient() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const [marketingOptIn, setMarketingOptIn] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const getAuthHeaders = useCallback(async (): Promise<Record<string, string>> => {
    const supabase = createClient()
    const { data: { user: u } } = await supabase.auth.getUser()
    if (!u) return {}
    const { data: { session } } = await supabase.auth.getSession()
    if (session?.access_token) {
      return { Authorization: `Bearer ${session.access_token}` }
    }
    return {}
  }, [])

  useEffect(() => {
    if (authLoading) return
    if (!user) {
      router.replace('/login?redirect=/app/settings/email')
      return
    }
    let cancelled = false
    ;(async () => {
      try {
        const headers = await getAuthHeaders()
        const res = await fetch('/api/email-preferences', { credentials: 'include', headers })
        if (!res.ok) {
          if (!cancelled) setError('Could not load preferences.')
          return
        }
        const data = await res.json()
        if (!cancelled) setMarketingOptIn(!!data.marketing_opt_in)
      } catch {
        if (!cancelled) setError('Could not load preferences.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [authLoading, user, router, getAuthHeaders])

  const save = async (next: boolean) => {
    setSaving(true)
    setError(null)
    setMessage(null)
    try {
      const headers = await getAuthHeaders()
      const res = await fetch('/api/email-preferences', {
        method: 'PATCH',
        credentials: 'include',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ marketing_opt_in: next }),
      })
      if (!res.ok) {
        setError('That didn\'t work. Try again.')
        return
      }
      const data = await res.json()
      setMarketingOptIn(!!data.marketing_opt_in)
      setMessage(
        data.marketing_opt_in
          ? 'You\'ll get product updates and tips.'
          : 'You\'re unsubscribed from product updates.'
      )
    } catch {
      setError('That didn\'t work. Try again.')
    } finally {
      setSaving(false)
    }
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-500 text-sm">
        Loading…
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#f3f4f6] py-10 px-4">
      <div className="max-w-md mx-auto bg-white rounded-2xl shadow-sm p-8">
        <div className="mb-6">
          <Link href="/profile" className="text-sm text-gray-600 hover:text-gray-900">
            ← Profile
          </Link>
        </div>
        <h1 className="text-xl font-semibold text-[#171717] mb-2">Email preferences</h1>
        <p className="text-sm text-[#374151] leading-relaxed mb-6">
          Choose whether FiBi can send product updates and tips. Account emails (like password reset)
          are separate.
        </p>

        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            className="mt-1 h-4 w-4 rounded border-gray-300"
            checked={marketingOptIn}
            disabled={saving}
            onChange={(e) => save(e.target.checked)}
          />
          <span className="text-sm text-[#171717]">
            Send me product updates and tips
          </span>
        </label>

        {message && (
          <p className="mt-4 text-sm text-emerald-700" role="status">
            {message}
          </p>
        )}
        {error && (
          <p className="mt-4 text-sm text-red-600" role="alert">
            {error}
          </p>
        )}
      </div>
    </div>
  )
}
