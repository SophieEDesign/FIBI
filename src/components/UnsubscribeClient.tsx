'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'

type Status = 'idle' | 'loading' | 'done' | 'error' | 'invalid'

export default function UnsubscribeClient() {
  const searchParams = useSearchParams()
  const token = searchParams.get('token')?.trim() || ''
  const [status, setStatus] = useState<Status>(token ? 'idle' : 'invalid')
  const [message, setMessage] = useState<string | null>(null)

  const unsubscribe = useCallback(async () => {
    if (!token) {
      setStatus('invalid')
      return
    }
    setStatus('loading')
    setMessage(null)
    try {
      const res = await fetch('/api/unsubscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })
      const data = (await res.json().catch(() => ({}))) as { message?: string; error?: string }
      if (!res.ok) {
        setStatus(res.status === 400 ? 'invalid' : 'error')
        setMessage(data.error || 'That didn\'t work. Try again.')
        return
      }
      setStatus('done')
      setMessage(data.message || 'You\'re unsubscribed from product updates.')
    } catch {
      setStatus('error')
      setMessage('That didn\'t work. Try again.')
    }
  }, [token])

  useEffect(() => {
    // Auto one-click style confirm when token present — user still sees calm confirmation
    if (!token) return
  }, [token])

  if (status === 'invalid' && !token) {
    return (
      <div className="max-w-md w-full bg-white rounded-2xl shadow-sm p-8 text-center">
        <h1 className="text-xl font-semibold text-[#171717] mb-2">
          Unsubscribe from FIBI emails
        </h1>
        <p className="text-[#374151] text-sm leading-relaxed mb-6">
          Use the unsubscribe link in your latest email, or manage preferences when you&apos;re signed
          in.
        </p>
        <Link
          href="/app/settings/email"
          className="inline-block px-5 py-2.5 bg-accent text-white text-sm font-medium rounded-full hover:bg-accent-hover transition-colors"
        >
          Email preferences
        </Link>
        <p className="mt-6 text-[#6b7280] text-xs">
          <Link href="https://fibi.world" className="underline hover:no-underline">
            fibi.world
          </Link>
        </p>
      </div>
    )
  }

  if (status === 'done') {
    return (
      <div className="max-w-md w-full bg-white rounded-2xl shadow-sm p-8 text-center">
        <h1 className="text-xl font-semibold text-[#171717] mb-2">You&apos;re unsubscribed</h1>
        <p className="text-[#374151] text-sm leading-relaxed mb-6">
          {message || 'You won\'t get product updates anymore. Account emails (like password reset) may still arrive when needed.'}
        </p>
        <Link
          href="/app/settings/email"
          className="inline-block px-5 py-2.5 border border-[color:var(--border-default)] text-[color:var(--text-primary)] text-sm font-medium rounded-full hover:bg-[color:var(--bg-subtle)] transition-colors"
        >
          Change preferences later
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-md w-full bg-white rounded-2xl shadow-sm p-8 text-center">
      <h1 className="text-xl font-semibold text-[#171717] mb-2">
        Unsubscribe from FIBI emails
      </h1>
      <p className="text-[#374151] text-sm leading-relaxed mb-6">
        Stop product updates and tips. You&apos;ll still get important account emails when needed.
      </p>
      {(status === 'error' || status === 'invalid') && message && (
        <p className="mb-4 text-sm text-red-600" role="alert">
          {message}
        </p>
      )}
      <button
        type="button"
        onClick={unsubscribe}
        disabled={status === 'loading' || !token}
        className="inline-block px-5 py-2.5 bg-accent text-white text-sm font-medium rounded-full hover:bg-accent-hover transition-colors disabled:opacity-50"
      >
        {status === 'loading' ? 'Working…' : 'Unsubscribe'}
      </button>
      <p className="mt-6 text-[#6b7280] text-xs">
        <Link href="/app/settings/email" className="underline hover:no-underline">
          Or manage preferences
        </Link>
      </p>
    </div>
  )
}
