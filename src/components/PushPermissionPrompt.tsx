'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { createClient } from '@/lib/supabase/client'
import {
  isPushSupported,
  isLikelyIos,
  isIosStandalone,
  subscribeToPush,
} from '@/lib/push-client'

const DISMISS_KEY = 'fibi_push_prompt_dismissed_at'
const DISMISS_DAYS = 14

/**
 * Soft prompt to turn on Web Push after the user has settled into the app.
 * Skips if unsupported, already subscribed, or recently dismissed.
 */
export default function PushPermissionPrompt() {
  const [visible, setVisible] = useState(false)
  const [busy, setBusy] = useState(false)
  const [hint, setHint] = useState<string | null>(null)

  useEffect(() => {
    if (!isPushSupported()) return
    if (typeof Notification !== 'undefined' && Notification.permission === 'denied') return

    try {
      const raw = localStorage.getItem(DISMISS_KEY)
      if (raw) {
        const dismissedAt = Number(raw)
        if (
          Number.isFinite(dismissedAt) &&
          Date.now() - dismissedAt < DISMISS_DAYS * 24 * 60 * 60 * 1000
        ) {
          return
        }
      }
    } catch {
      // ignore storage errors
    }

    const timer = setTimeout(async () => {
      try {
        const supabase = createClient()
        const { data: { session } } = await supabase.auth.getSession()
        if (!session?.access_token) return

        const res = await fetch('/api/push/subscribe', {
          credentials: 'include',
          headers: { Authorization: `Bearer ${session.access_token}` },
        })
        if (!res.ok) return
        const data = await res.json()
        if (!data.configured || data.subscribed) return
        if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
          // Permission already granted — subscribe quietly, no banner
          if (data.publicKey) {
            await subscribeToPush(data.publicKey, {
              Authorization: `Bearer ${session.access_token}`,
            })
          }
          return
        }
        setVisible(true)
      } catch {
        // ignore
      }
    }, 8000)

    return () => clearTimeout(timer)
  }, [])

  const dismiss = () => {
    setVisible(false)
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()))
    } catch {
      // ignore
    }
  }

  const enable = async () => {
    setBusy(true)
    setHint(null)
    try {
      if (isLikelyIos() && !isIosStandalone()) {
        setHint('On iPhone, add FIBI to your Home Screen first, then try again.')
        setBusy(false)
        return
      }

      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        setHint("That didn't work. Try again.")
        setBusy(false)
        return
      }

      const statusRes = await fetch('/api/push/subscribe', {
        credentials: 'include',
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      const status = await statusRes.json().catch(() => ({}))
      const publicKey =
        (typeof status.publicKey === 'string' && status.publicKey) ||
        process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ||
        ''

      if (!publicKey) {
        setHint('Notifications are not set up yet.')
        setBusy(false)
        return
      }

      const result = await subscribeToPush(publicKey, {
        Authorization: `Bearer ${session.access_token}`,
      })
      if (!result.ok) {
        setHint(result.error)
        setBusy(false)
        return
      }
      setVisible(false)
    } catch {
      setHint("That didn't work. Try again.")
    } finally {
      setBusy(false)
    }
  }

  if (!visible) return null

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 md:left-auto md:right-4 md:w-96">
      <div className="rounded-2xl border border-[#E5E5E5] bg-white p-4 shadow-soft-md">
        <h3 className="mb-1 text-sm font-semibold text-[#17181A]">Stay gently in the loop</h3>
        <p className="mb-3 text-xs leading-relaxed text-[#5C574C]">
          Get a quiet ping when FIBI has something useful — like a new guide or an update.
        </p>
        {hint && (
          <p className="mb-3 text-xs text-[#8A5A2B]" role="status">
            {hint}
          </p>
        )}
        <div className="flex gap-2">
          <Button size="sm" onClick={enable} disabled={busy}>
            {busy ? 'Turning on…' : 'Turn on'}
          </Button>
          <Button size="sm" variant="ghost" onClick={dismiss} disabled={busy}>
            Not now
          </Button>
        </div>
      </div>
    </div>
  )
}
