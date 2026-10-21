'use client'

import { useEffect, useState } from 'react'
import { getAdminAuthHeaders } from '@/lib/admin-auth-headers'

const DEFAULT_TITLE = "FIBI's had an upgrade"
const DEFAULT_BODY = 'Places are easier to save and find. Open FIBI to see what changed.'
const DEFAULT_URL = 'https://fibi.world/app'

export default function AdminPushClient() {
  const [configured, setConfigured] = useState(false)
  const [count, setCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [title, setTitle] = useState(DEFAULT_TITLE)
  const [body, setBody] = useState(DEFAULT_BODY)
  const [url, setUrl] = useState(DEFAULT_URL)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null
  )

  const load = async () => {
    try {
      const headers = await getAdminAuthHeaders()
      const res = await fetch('/api/admin/push/send', { credentials: 'include', headers })
      if (!res.ok) return
      const data = await res.json()
      setConfigured(!!data.configured)
      setCount(typeof data.subscription_count === 'number' ? data.subscription_count : 0)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  const send = async () => {
    setMessage(null)
    if (!title.trim() || !body.trim()) {
      setMessage({ type: 'error', text: 'Add a title and a short message.' })
      return
    }
    const ok = window.confirm(
      count > 0
        ? `Send this push to about ${count} device${count === 1 ? '' : 's'}?`
        : 'No devices are subscribed yet. Send anyway?'
    )
    if (!ok) return

    setSending(true)
    try {
      const headers = await getAdminAuthHeaders()
      const res = await fetch('/api/admin/push/send', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify({
          title: title.trim(),
          body: body.trim(),
          url: url.trim() || '/app',
          tag: 'fibi-upgrade',
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setMessage({ type: 'error', text: data.error || "That didn't work. Try again." })
        return
      }
      setMessage({
        type: 'success',
        text: `Sent ${data.sent ?? 0}. Failed ${data.failed ?? 0}. Removed stale ${data.removed ?? 0}.`,
      })
      await load()
    } catch {
      setMessage({ type: 'error', text: "That didn't work. Try again." })
    } finally {
      setSending(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[30vh] items-center justify-center text-[#8A857A]">Loading…</div>
    )
  }

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-[#17181A]">Push notifications</h1>
        <p className="mt-1 text-sm text-[#5C574C]">
          Send a quiet ping to browsers that turned notifications on.
        </p>
      </div>

      <div className="rounded-2xl border border-[#E5E5E5] bg-white p-5">
        <p className="text-sm text-[#17181A]">
          {configured ? (
            <>
              <span className="font-medium">{count}</span> subscribed device
              {count === 1 ? '' : 's'}
            </>
          ) : (
            <span className="text-[#8A5A2B]">
              Push keys are not set. Add NEXT_PUBLIC_VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY in
              Vercel, then redeploy.
            </span>
          )}
        </p>
      </div>

      <div className="space-y-4 rounded-2xl border border-[#E5E5E5] bg-white p-5">
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-[#17181A]">Title</span>
          <input
            className="w-full rounded-xl border border-[#E5E5E5] px-3 py-2 text-sm text-[#17181A]"
            value={title}
            maxLength={120}
            onChange={(e) => setTitle(e.target.value)}
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-[#17181A]">Message</span>
          <textarea
            className="w-full rounded-xl border border-[#E5E5E5] px-3 py-2 text-sm text-[#17181A]"
            rows={3}
            value={body}
            maxLength={240}
            onChange={(e) => setBody(e.target.value)}
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-[#17181A]">Open URL</span>
          <input
            className="w-full rounded-xl border border-[#E5E5E5] px-3 py-2 text-sm text-[#17181A]"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
        </label>

        {message && (
          <p
            className={`text-sm ${message.type === 'success' ? 'text-emerald-700' : 'text-red-600'}`}
            role="status"
          >
            {message.text}
          </p>
        )}

        <button
          type="button"
          onClick={send}
          disabled={sending || !configured}
          className="rounded-full bg-[#14639B] px-5 py-2.5 text-sm font-medium text-white transition-opacity disabled:opacity-50"
        >
          {sending ? 'Sending…' : 'Send push'}
        </button>
      </div>
    </div>
  )
}
