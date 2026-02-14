'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
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

export default function AdminDashboard() {
  const [users, setUsers] = useState<UserData[]>([])
  const [metrics, setMetrics] = useState<Metrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sendingWelcomeId, setSendingWelcomeId] = useState<string | null>(null)
  const [sendingNudgeId, setSendingNudgeId] = useState<string | null>(null)
  const [rowActionError, setRowActionError] = useState<string | null>(null)
  const [automationsRunning, setAutomationsRunning] = useState(false)
  const [automationsResult, setAutomationsResult] = useState<{
    sent: number
    skipped: number
    failed: number
    limitReached?: boolean
    errors?: string[]
  } | null>(null)

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

  const NUDGE_ELIGIBLE_AGE_MS = 48 * 60 * 60 * 1000

  const handleRunAutomations = async () => {
    setAutomationsResult(null)
    setAutomationsRunning(true)
    try {
      const headers = await getAuthHeaders()
      const res = await fetch('/api/admin/emails/run-automations', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', ...headers },
      })
      const data = await res.json()
      if (!res.ok) {
        setAutomationsResult({
          sent: 0,
          skipped: 0,
          failed: 0,
          errors: [data.error || data.detail || 'Request failed'],
        })
        return
      }
      setAutomationsResult({
        sent: data.sent ?? 0,
        skipped: data.skipped ?? 0,
        failed: data.failed ?? 0,
        limitReached: data.limitReached,
        errors: data.errors,
      })
    } catch (err) {
      setAutomationsResult({
        sent: 0,
        skipped: 0,
        failed: 0,
        errors: [err instanceof Error ? err.message : 'Request failed'],
      })
    } finally {
      setAutomationsRunning(false)
    }
  }

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
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
            <p className="mt-2 text-sm text-gray-600">User management and analytics</p>
          </div>
          <div className="flex gap-4">
            <Link
              href="/app/admin"
              className="text-sm font-medium text-gray-900"
            >
              Users
            </Link>
            <Link
              href="/app/admin/emails/templates"
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              Email Templates
            </Link>
            <Link
              href="/app/admin/emails/automations"
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              Automations
            </Link>
          </div>
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

        {/* Run Email Automations */}
        <div className="mb-8 bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Run Email Automations Now</h2>
          <p className="text-sm text-gray-600 mb-4">
            Manually trigger the email automation runner. Rules: max 1 email per user per 48h; never send same template twice; max 3 lifecycle emails per user; rate-limited to ~2/sec.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleRunAutomations}
              disabled={automationsRunning}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-gray-800 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50 disabled:pointer-events-none"
            >
              {automationsRunning ? 'Running…' : 'Run Email Automations Now'}
            </button>
          </div>
          {automationsResult && (
            <div className="mt-4 p-4 rounded-lg border bg-gray-50 border-gray-200">
              <p className="text-sm text-gray-800">
                <strong>Done.</strong> Sent: {automationsResult.sent}, Skipped: {automationsResult.skipped}, Failed: {automationsResult.failed}
                {automationsResult.limitReached && ' (limit reached)'}
              </p>
              {automationsResult.errors && automationsResult.errors.length > 0 && (
                <ul className="mt-2 text-sm text-red-700 list-disc list-inside">
                  {automationsResult.errors.slice(0, 10).map((e, i) => (
                    <li key={i}>{e}</li>
                  ))}
                  {automationsResult.errors.length > 10 && (
                    <li>… and {automationsResult.errors.length - 10} more</li>
                  )}
                </ul>
              )}
            </div>
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

