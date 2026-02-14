'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

interface UserData {
  id: string
  email: string | null
  email_confirmed_at: string | null
  created_at: string
  last_login_at: string | null
  first_place_added_at: string | null
  places_count: number
  welcome_email_sent: boolean
  onboarding_nudge_sent: boolean
}

interface Metrics {
  totalUsers: number
  confirmedUsers: number
  usersWithLogin: number
  usersWithPlaces: number
  activeLast7Days: number
}

interface FoundingFollowupEligible {
  count: number
  users: { id: string; email: string }[]
}

export default function AdminDashboard() {
  const [users, setUsers] = useState<UserData[]>([])
  const [metrics, setMetrics] = useState<Metrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [foundingEligible, setFoundingEligible] = useState<FoundingFollowupEligible | null>(null)
  const [foundingLoading, setFoundingLoading] = useState(false)
  const [foundingSending, setFoundingSending] = useState(false)
  const [foundingResult, setFoundingResult] = useState<{
    sent: number
    failed: number
    errors?: string[]
  } | null>(null)
  const [showFoundingConfirm, setShowFoundingConfirm] = useState(false)
  const [sendingWelcomeId, setSendingWelcomeId] = useState<string | null>(null)
  const [sendingNudgeId, setSendingNudgeId] = useState<string | null>(null)
  const [rowActionError, setRowActionError] = useState<string | null>(null)

  const getAuthHeaders = useCallback(async (): Promise<Record<string, string>> => {
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (session?.access_token) {
      return { Authorization: `Bearer ${session.access_token}` }
    }
    return {}
  }, [])

  const fetchUsers = async () => {
    try {
      const headers = await getAuthHeaders()
      const response = await fetch('/api/admin/users', { credentials: 'include', headers })
      if (!response.ok) {
        if (response.status === 403) {
          setError('Access denied. Admin role required.')
        } else if (response.status === 401) {
          setError('Could not load user data (401). If this is a Vercel preview with Deployment Protection, add the preview URL to Deployment Protection Exceptions in Vercel project settings.')
        } else {
          setError('Failed to load user data')
        }
        setLoading(false)
        return
      }
      const data = await response.json()
      setUsers(data.users || [])
      setMetrics(data.metrics || null)
    } catch (err) {
      console.error('Error fetching admin data:', err)
      setError('Failed to load user data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchFoundingEligible = async () => {
    setFoundingLoading(true)
    setFoundingResult(null)
    try {
      const headers = await getAuthHeaders()
      const res = await fetch('/api/admin/founding-followup', { credentials: 'include', headers })
      if (!res.ok) {
        setFoundingEligible(null)
        return
      }
      const data = await res.json()
      setFoundingEligible({ count: data.count ?? 0, users: data.users ?? [] })
    } catch {
      setFoundingEligible(null)
    } finally {
      setFoundingLoading(false)
    }
  }

  useEffect(() => {
    if (!loading && !error) fetchFoundingEligible()
  }, [loading, error])

  const handleFoundingSend = async () => {
    if (!foundingEligible?.count) return
    setFoundingSending(true)
    setShowFoundingConfirm(false)
    setFoundingResult(null)
    try {
      const headers = await getAuthHeaders()
      const res = await fetch('/api/admin/founding-followup', { method: 'POST', credentials: 'include', headers })
      const data = await res.json()
      if (!res.ok) {
        setFoundingResult({ sent: 0, failed: foundingEligible.count, errors: [data.error] })
        return
      }
      setFoundingResult({
        sent: data.sent ?? 0,
        failed: data.failed ?? 0,
        errors: data.errors,
      })
      await fetchFoundingEligible()
    } catch (err) {
      setFoundingResult({
        sent: 0,
        failed: foundingEligible.count,
        errors: [err instanceof Error ? err.message : 'Request failed'],
      })
    } finally {
      setFoundingSending(false)
    }
  }

  const NUDGE_ELIGIBLE_AGE_MS = 48 * 60 * 60 * 1000

  const canSendWelcome = (user: UserData) =>
    user.email_confirmed_at != null && !user.welcome_email_sent

  const canSendNudge = (user: UserData) => {
    if (!user.email_confirmed_at || user.onboarding_nudge_sent) return false
    const createdAt = new Date(user.created_at).getTime()
    return Date.now() - createdAt >= NUDGE_ELIGIBLE_AGE_MS
  }

  const handleSendWelcome = async (userId: string) => {
    setRowActionError(null)
    setSendingWelcomeId(userId)
    try {
      const authHeaders = await getAuthHeaders()
      const res = await fetch('/api/admin/send-welcome', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify({ userId }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setRowActionError(data.error || 'Failed to send welcome email')
        return
      }
      await fetchUsers()
    } catch (err) {
      setRowActionError(err instanceof Error ? err.message : 'Request failed')
    } finally {
      setSendingWelcomeId(null)
    }
  }

  const handleSendNudge = async (userId: string) => {
    setRowActionError(null)
    setSendingNudgeId(userId)
    try {
      const authHeaders = await getAuthHeaders()
      const res = await fetch('/api/admin/send-onboarding-nudge', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify({ userId }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setRowActionError(data.error || 'Failed to send nudge')
        return
      }
      await fetchUsers()
    } catch (err) {
      setRowActionError(err instanceof Error ? err.message : 'Request failed')
    } finally {
      setSendingNudgeId(null)
    }
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '—'
    try {
      return new Date(dateString).toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    } catch {
      return '—'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-500">Loading admin dashboard...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-red-500">{error}</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="mt-2 text-sm text-gray-600">User management and analytics</p>
        </div>

        {/* Summary Metrics */}
        {metrics && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5 mb-8">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-sm font-medium text-gray-500">Total Users</div>
              <div className="mt-2 text-3xl font-semibold text-gray-900">{metrics.totalUsers}</div>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-sm font-medium text-gray-500">Confirmed (email)</div>
              <div className="mt-2 text-3xl font-semibold text-gray-900">{metrics.confirmedUsers}</div>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-sm font-medium text-gray-500">Users with Login</div>
              <div className="mt-2 text-3xl font-semibold text-gray-900">{metrics.usersWithLogin}</div>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-sm font-medium text-gray-500">Users with Places</div>
              <div className="mt-2 text-3xl font-semibold text-gray-900">{metrics.usersWithPlaces}</div>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-sm font-medium text-gray-500">Active Last 7 Days</div>
              <div className="mt-2 text-3xl font-semibold text-gray-900">{metrics.activeLast7Days}</div>
            </div>
          </div>
        )}

        {/* Send Founding Follow-Up */}
        <div className="mb-8 bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Send Founding Follow-Up</h2>
          <p className="text-sm text-gray-600 mb-4">
            One-time personal email (from Sophie) asking what made them sign up. Only confirmed users who have not received it.
          </p>
          {foundingLoading ? (
            <p className="text-sm text-gray-500">Loading eligible count…</p>
          ) : (
            <>
              <p className="text-sm text-gray-700 mb-4">
                <strong>Eligible users:</strong>{' '}
                {foundingEligible?.count ?? 0}
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => setShowFoundingConfirm(true)}
                  disabled={!foundingEligible?.count || foundingSending}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-gray-800 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50 disabled:pointer-events-none"
                >
                  {foundingSending ? 'Sending…' : 'Send Founding Follow-Up'}
                </button>
                {foundingEligible?.count ? (
                  <button
                    type="button"
                    onClick={fetchFoundingEligible}
                    disabled={foundingLoading || foundingSending}
                    className="text-sm text-gray-600 hover:text-gray-900"
                  >
                    Refresh count
                  </button>
                ) : null}
              </div>
              {showFoundingConfirm && foundingEligible && foundingEligible.count > 0 && (
                <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <p className="text-sm text-gray-800 mb-3">
                    Send the founding follow-up email to <strong>{foundingEligible.count}</strong> user{foundingEligible.count !== 1 ? 's' : ''}? This cannot be undone (they will be marked as sent).
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleFoundingSend}
                      className="px-3 py-1.5 text-sm font-medium text-white bg-gray-800 hover:bg-gray-700 rounded"
                    >
                      Yes, send
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowFoundingConfirm(false)}
                      className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
              {foundingResult && (
                <div className="mt-4 p-4 rounded-lg border bg-gray-50 border-gray-200">
                  <p className="text-sm text-gray-800">
                    <strong>Done.</strong> Sent: {foundingResult.sent}, Failed: {foundingResult.failed}
                  </p>
                  {foundingResult.errors && foundingResult.errors.length > 0 && (
                    <ul className="mt-2 text-sm text-red-700 list-disc list-inside">
                      {foundingResult.errors.slice(0, 10).map((e, i) => (
                        <li key={i}>{e}</li>
                      ))}
                      {foundingResult.errors.length > 10 && (
                        <li>… and {foundingResult.errors.length - 10} more</li>
                      )}
                    </ul>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Users Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between flex-wrap gap-2">
            <h2 className="text-lg font-semibold text-gray-900">Users</h2>
            {rowActionError && (
              <p className="text-sm text-red-600" role="alert">
                {rowActionError}
              </p>
            )}
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Email Confirmed
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created At
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Last Login
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    First Place Added
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Places
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Welcome sent
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Nudge sent
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {users.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-6 py-4 text-center text-gray-500">
                      No users found
                    </td>
                  </tr>
                ) : (
                  users.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {user.email || '—'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(user.email_confirmed_at)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(user.created_at)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(user.last_login_at)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(user.first_place_added_at)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {user.places_count}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {user.welcome_email_sent ? 'Yes' : '—'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {user.onboarding_nudge_sent ? 'Yes' : '—'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div className="flex flex-wrap gap-1">
                          <button
                            type="button"
                            onClick={() => handleSendWelcome(user.id)}
                            disabled={!canSendWelcome(user) || sendingWelcomeId !== null}
                            aria-label={`Send welcome email to ${user.email || 'user'}`}
                            className="px-2 py-1 text-xs font-medium rounded border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:pointer-events-none"
                          >
                            {sendingWelcomeId === user.id ? 'Sending…' : 'Send welcome'}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSendNudge(user.id)}
                            disabled={!canSendNudge(user) || sendingNudgeId !== null}
                            aria-label={`Send onboarding nudge to ${user.email || 'user'}`}
                            className="px-2 py-1 text-xs font-medium rounded border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:pointer-events-none"
                          >
                            {sendingNudgeId === user.id ? 'Sending…' : 'Send nudge'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}

