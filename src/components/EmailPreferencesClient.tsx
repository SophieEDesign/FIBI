'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/useAuth'
import { createClient } from '@/lib/supabase/client'
import {
  isPushSupported,
  isLikelyIos,
  isIosStandalone,
  subscribeToPush,
  unsubscribeFromPush,
} from '@/lib/push-client'

export default function EmailPreferencesClient() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const [marketingOptIn, setMarketingOptIn] = useState(false)
  const [pushConfigured, setPushConfigured] = useState(false)
  const [pushSubscribed, setPushSubscribed] = useState(false)
  const [pushPublicKey, setPushPublicKey] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [pushSaving, setPushSaving] = useState(false)
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
        const [emailRes, pushRes] = await Promise.all([
          fetch('/api/email-preferences', { credentials: 'include', headers }),
          fetch('/api/push/subscribe', { credentials: 'include', headers }),
        ])
        if (!emailRes.ok) {
          if (!cancelled) setError('Could not load preferences.')
          return
        }
        const data = await emailRes.json()
        if (!cancelled) setMarketingOptIn(!!data.marketing_opt_in)

        if (pushRes.ok) {
          const pushData = await pushRes.json()
          if (!cancelled) {
            setPushConfigured(!!pushData.configured)
            setPushSubscribed(!!pushData.subscribed)
            setPushPublicKey(
              typeof pushData.publicKey === 'string' ? pushData.publicKey : null
            )
          }
        }
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
        setError("That didn't work. Try again.")
        return
      }
      const data = await res.json()
      setMarketingOptIn(!!data.marketing_opt_in)
      setMessage(
        data.marketing_opt_in
          ? "You'll get product updates and tips."
          : "You're unsubscribed from product updates."
      )
    } catch {
      setError("That didn't work. Try again.")
    } finally {
      setSaving(false)
    }
  }

  const savePush = async (next: boolean) => {
    setPushSaving(true)
    setError(null)
    setMessage(null)
    try {
      const headers = await getAuthHeaders()
      if (next) {
        if (isLikelyIos() && !isIosStandalone()) {
          setError('On iPhone, add FIBI to your Home Screen first, then turn on notifications.')
          return
        }
        const key = pushPublicKey || process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || ''
        if (!key) {
          setError('Notifications are not set up yet.')
          return
        }
        const result = await subscribeToPush(key, headers)
        if (!result.ok) {
          setError(result.error)
          return
        }
        setPushSubscribed(true)
        setMessage("You'll get a quiet ping for useful updates.")
      } else {
        const result = await unsubscribeFromPush(headers)
        if (!result.ok) {
          setError(result.error)
          return
        }
        setPushSubscribed(false)
        setMessage('Browser notifications are off.')
      }
    } catch {
      setError("That didn't work. Try again.")
    } finally {
      setPushSaving(false)
    }
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-500 text-sm">
        Loading…
      </div>
    )
  }

  const showPushToggle = pushConfigured && isPushSupported()

  return (
    <div className="min-h-screen bg-[#f3f4f6] py-10 px-4">
      <div className="max-w-md mx-auto bg-white rounded-2xl shadow-sm p-8">
        <div className="mb-6">
          <Link href="/profile" className="text-sm text-gray-600 hover:text-gray-900">
            ← Profile
          </Link>
        </div>
        <h1 className="text-xl font-semibold text-[#171717] mb-2">Notifications</h1>
        <p className="text-sm text-[#374151] leading-relaxed mb-6">
          Choose how FIBI can reach you. Account emails (like password reset) are separate.
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
            Send me product updates and tips by email
          </span>
        </label>

        {showPushToggle && (
          <label className="mt-5 flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              className="mt-1 h-4 w-4 rounded border-gray-300"
              checked={pushSubscribed}
              disabled={pushSaving}
              onChange={(e) => savePush(e.target.checked)}
            />
            <span className="text-sm text-[#171717]">
              Notify me in this browser when there&apos;s something useful
            </span>
          </label>
        )}

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
