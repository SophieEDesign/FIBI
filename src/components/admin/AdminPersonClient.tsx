'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { getAdminAuthHeaders } from '@/lib/admin-auth-headers'
import { PERSON_STATE_LABELS, type PersonLifecycleState } from '@/lib/admin-metrics'
import AdminConfirmDialog from '@/components/admin/AdminConfirmDialog'

interface PersonDetail {
  id: string
  email: string | null
  email_confirmed_at: string | null
  created_at: string
  last_login_at: string | null
  first_place_added_at: string | null
  places_count: number
  trips_count: number
  welcome_email_sent: boolean
  onboarding_nudge_sent: boolean
  state: PersonLifecycleState
  welcome_opened_at: string | null
  welcome_sent_at: string | null
  nudge_sent_at: string | null
}

interface PlaceRow {
  id: string
  title: string | null
  url: string | null
  category: string | null
  location_city: string | null
  location_country: string | null
  created_at: string
}

const NUDGE_ELIGIBLE_AGE_MS = 48 * 60 * 60 * 1000

function formatWhen(iso: string | null) {
  if (!iso) return null
  try {
    return new Date(iso).toLocaleString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return null
  }
}

export default function AdminPersonClient({ userId }: { userId: string }) {
  const router = useRouter()
  const [user, setUser] = useState<PersonDetail | null>(null)
  const [places, setPlaces] = useState<PlaceRow[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [showPlaces, setShowPlaces] = useState(false)
  const [deleteStep, setDeleteStep] = useState<0 | 1 | 2>(0)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const headers = await getAdminAuthHeaders()
      const res = await fetch(`/api/admin/users/${userId}`, { credentials: 'include', headers })
      if (!res.ok) {
        setError(res.status === 404 ? 'Person not found' : "That didn't work. Try again.")
        return
      }
      const data = await res.json()
      setUser(data.user)
    } catch {
      setError("That didn't work. Try again.")
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    void load()
  }, [load])

  const loadPlaces = async () => {
    setShowPlaces(true)
    if (places) return
    try {
      const headers = await getAdminAuthHeaders()
      const res = await fetch(`/api/admin/users/${userId}/places`, {
        credentials: 'include',
        headers,
      })
      if (!res.ok) return
      const data = await res.json()
      setPlaces(data.places ?? [])
    } catch {
      setPlaces([])
    }
  }

  const sendWelcome = async () => {
    setActionError(null)
    setBusy('welcome')
    try {
      const headers = await getAdminAuthHeaders()
      const res = await fetch('/api/admin/send-welcome', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify({ userId }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setActionError(data.error || "That didn't work. Try again.")
        return
      }
      await load()
    } finally {
      setBusy(null)
    }
  }

  const sendNudge = async () => {
    setActionError(null)
    setBusy('nudge')
    try {
      const headers = await getAdminAuthHeaders()
      const res = await fetch('/api/admin/send-onboarding-nudge', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify({ userId }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setActionError(data.error || "That didn't work. Try again.")
        return
      }
      await load()
    } finally {
      setBusy(null)
    }
  }

  const resendConfirm = async () => {
    setActionError(null)
    setBusy('confirm')
    try {
      const headers = await getAdminAuthHeaders()
      const res = await fetch(`/api/admin/users/${userId}/resend-confirmation`, {
        method: 'POST',
        credentials: 'include',
        headers,
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setActionError(data.error || "That didn't work. Try again.")
        return
      }
    } finally {
      setBusy(null)
    }
  }

  const deleteAccount = async () => {
    setBusy('delete')
    try {
      const headers = await getAdminAuthHeaders()
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE',
        credentials: 'include',
        headers,
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setActionError(data.error || "That didn't work. Try again.")
        setDeleteStep(0)
        return
      }
      router.push('/app/admin/people')
    } finally {
      setBusy(null)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-[#8A857A]">Loading…</div>
    )
  }

  if (error || !user) {
    return (
      <div className="px-4 py-8 sm:px-6 lg:px-8">
        <Link href="/app/admin/people" className="text-sm text-[#14639B] hover:underline">
          ← People
        </Link>
        <p className="mt-4 text-sm text-[#9C3226]">{error || 'Not found'}</p>
      </div>
    )
  }

  const canWelcome = !!user.email_confirmed_at && !user.welcome_email_sent
  const welcomeDisabledReason = !user.email_confirmed_at
    ? 'Not needed — email not confirmed yet'
    : user.welcome_email_sent
      ? 'Already sent'
      : null

  const nudgeAgeOk = Date.now() - new Date(user.created_at).getTime() >= NUDGE_ELIGIBLE_AGE_MS
  const canNudge =
    !!user.email_confirmed_at && !user.onboarding_nudge_sent && nudgeAgeOk && user.places_count === 0
  const nudgeDisabledReason = !user.email_confirmed_at
    ? 'Not needed — email not confirmed yet'
    : user.onboarding_nudge_sent
      ? 'Already sent'
      : user.places_count > 0
        ? 'Not needed — already saving'
        : !nudgeAgeOk
          ? 'Not yet — wait 48 hours after signup'
          : null

  const canResendConfirm = !user.email_confirmed_at
  const confirmDisabledReason = user.email_confirmed_at ? 'Not needed — already confirmed' : null

  const history = [
    { label: 'Signed up', at: user.created_at },
    { label: 'Confirmed', at: user.email_confirmed_at },
    { label: 'Welcome opened', at: user.welcome_opened_at },
    { label: 'First place', at: user.first_place_added_at },
    { label: 'Nudge sent', at: user.nudge_sent_at || (user.onboarding_nudge_sent ? user.created_at : null) },
    { label: 'Last seen', at: user.last_login_at },
  ]

  return (
    <div className="px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl space-y-6">
        <div>
          <Link href="/app/admin/people" className="text-sm text-[#14639B] hover:underline">
            ← People
          </Link>
          <h1 className="mt-2 text-2xl font-semibold text-[#17181A]">
            {user.email || 'No email'}
          </h1>
          <div className="mt-3 flex flex-wrap gap-2">
            <span className="rounded-full bg-[#E4F4FE] px-2.5 py-1 text-xs font-medium text-[#14639B]">
              {PERSON_STATE_LABELS[user.state]}
            </span>
            <span className="rounded-full bg-[#F1EEE6] px-2.5 py-1 text-xs text-[#5C574C]">
              {user.places_count} places
            </span>
            <span className="rounded-full bg-[#F1EEE6] px-2.5 py-1 text-xs text-[#5C574C]">
              {user.trips_count} trips
            </span>
          </div>
        </div>

        {actionError && (
          <p className="text-sm text-[#9C3226]" role="alert">
            {actionError}
          </p>
        )}

        <section className="rounded-[14px] border border-[#E5E5E5] bg-white p-5 shadow-[0_1px_2px_rgba(26,26,24,0.06),0_8px_24px_rgba(46,70,120,0.08)]">
          <h2 className="text-base font-semibold text-[#17181A]">History</h2>
          <ol className="relative mt-4 space-y-4 border-l border-[#E5E5E5] pl-4">
            {history.map((step) => {
              const when = formatWhen(step.at)
              return (
                <li key={step.label} className="relative">
                  <span
                    className={`absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full ${
                      when ? 'bg-[#2E9EE8]' : 'bg-[#DAD5C9]'
                    }`}
                  />
                  <p className="text-sm font-medium text-[#17181A]">{step.label}</p>
                  <p className="text-xs text-[#8A857A]">{when || 'Not yet'}</p>
                </li>
              )
            })}
          </ol>
        </section>

        <section className="rounded-[14px] border border-[#E5E5E5] bg-white p-5 shadow-[0_1px_2px_rgba(26,26,24,0.06),0_8px_24px_rgba(46,70,120,0.08)]">
          <h2 className="text-base font-semibold text-[#17181A]">Actions</h2>
          <ul className="mt-4 space-y-3">
            <li>
              <button
                type="button"
                disabled={!canWelcome || busy !== null}
                onClick={sendWelcome}
                className="rounded-full bg-[#2E9EE8] px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-[#DAD5C9]"
              >
                {busy === 'welcome' ? 'Sending…' : 'Send welcome'}
              </button>
              {welcomeDisabledReason && (
                <p className="mt-1 text-xs text-[#8A857A]">{welcomeDisabledReason}</p>
              )}
            </li>
            <li>
              <button
                type="button"
                disabled={!canNudge || busy !== null}
                onClick={sendNudge}
                className="rounded-full border border-[#E5E5E5] bg-white px-4 py-2 text-sm font-medium text-[#17181A] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {busy === 'nudge' ? 'Sending…' : 'Send onboarding nudge'}
              </button>
              {nudgeDisabledReason && (
                <p className="mt-1 text-xs text-[#8A857A]">{nudgeDisabledReason}</p>
              )}
            </li>
            <li>
              <button
                type="button"
                disabled={!canResendConfirm || busy !== null}
                onClick={resendConfirm}
                className="rounded-full border border-[#E5E5E5] bg-white px-4 py-2 text-sm font-medium text-[#17181A] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {busy === 'confirm' ? 'Sending…' : 'Resend confirmation'}
              </button>
              {confirmDisabledReason && (
                <p className="mt-1 text-xs text-[#8A857A]">{confirmDisabledReason}</p>
              )}
            </li>
            <li>
              <button
                type="button"
                onClick={loadPlaces}
                className="rounded-full border border-[#E5E5E5] bg-white px-4 py-2 text-sm font-medium text-[#17181A]"
              >
                View saved places
              </button>
            </li>
            <li>
              <button
                type="button"
                onClick={() => setDeleteStep(1)}
                className="rounded-full border border-[#FBE7E5] bg-[#FBE7E5] px-4 py-2 text-sm font-medium text-[#9C3226]"
              >
                Delete account
              </button>
            </li>
          </ul>
        </section>

        {showPlaces && (
          <section className="rounded-[14px] border border-[#E5E5E5] bg-white p-5 shadow-[0_1px_2px_rgba(26,26,24,0.06),0_8px_24px_rgba(46,70,120,0.08)]">
            <h2 className="text-base font-semibold text-[#17181A]">Saved places</h2>
            {!places ? (
              <p className="mt-2 text-sm text-[#8A857A]">Loading…</p>
            ) : places.length === 0 ? (
              <p className="mt-2 text-sm text-[#8A857A]">No saved places yet.</p>
            ) : (
              <ul className="mt-3 divide-y divide-[#E5E5E5]">
                {places.map((p) => (
                  <li key={p.id} className="py-2 text-sm">
                    <p className="font-medium text-[#17181A]">{p.title || 'Untitled'}</p>
                    <p className="text-xs text-[#8A857A]">
                      {[p.category, p.location_city, p.location_country].filter(Boolean).join(' · ') ||
                        '—'}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}
      </div>

      <AdminConfirmDialog
        open={deleteStep === 1}
        title="Delete this account?"
        body={`This will permanently delete ${user.email || 'this user'} and their data. Continue to confirm.`}
        confirmLabel="Continue"
        danger
        onCancel={() => setDeleteStep(0)}
        onConfirm={() => setDeleteStep(2)}
      />
      <AdminConfirmDialog
        open={deleteStep === 2}
        title="Confirm permanent delete"
        body="This cannot be undone. Delete the account now?"
        confirmLabel="Delete account"
        danger
        busy={busy === 'delete'}
        onCancel={() => setDeleteStep(0)}
        onConfirm={deleteAccount}
      />
    </div>
  )
}
