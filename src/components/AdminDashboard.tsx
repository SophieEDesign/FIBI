'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import type { FunnelStage, InsightSummary } from '@/lib/admin-metrics'
import AdminFunnel from '@/components/admin/AdminFunnel'
import ProductHealthInsights from '@/components/admin/ProductHealthInsights'
import EmailAutomationPanel from '@/components/admin/EmailAutomationPanel'

interface UserData {
  id: string
  email: string | null
  email_confirmed_at: string | null
  created_at: string
  last_login_at: string | null
  first_place_added_at: string | null
  first_trip_created_at?: string | null
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
  const [funnel, setFunnel] = useState<FunnelStage[]>([])
  const [insights, setInsights] = useState<InsightSummary | null>(null)
  const [automationLastRun, setAutomationLastRun] = useState<{
    started_at: string
    finished_at: string | null
    sent: number
    skipped: number
    failed: number
    status: 'running' | 'success' | 'failure'
    errors: string[]
  } | null>(null)
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
  const [emailFooterAddress, setEmailFooterAddress] = useState('')
  const [emailFooterSaving, setEmailFooterSaving] = useState(false)
  const [emailFooterMessage, setEmailFooterMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [gaMeasurementId, setGaMeasurementId] = useState('')
  const [gaSaving, setGaSaving] = useState(false)
  const [gaMessage, setGaMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const getAuthHeaders = useCallback(async (): Promise<Record<string, string>> => {
    const supabase = createClient()
    // Prefer getUser() first so the session is refreshed if needed (getSession() can be stale/expired and cause 401 on live)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return {}
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
          setError('Could not load user data (401). Try signing out and back in. If you\'re on a preview deployment, add the URL to Vercel Deployment Protection Exceptions.')
        } else {
          setError('Failed to load user data')
        }
        setLoading(false)
        return
      }
      const data = await response.json()
      setUsers(data.users || [])
      setMetrics(data.metrics || null)
      setFunnel(data.funnel || [])
      setInsights(data.insights || null)
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

  useEffect(() => {
    let cancelled = false
    getAuthHeaders().then((headers) => {
      fetch('/api/admin/site-settings', { credentials: 'include', headers: { ...headers } })
        .then((res) => (res.ok ? res.json() : null))
        .then((json) => {
          if (!cancelled && json) {
            if (typeof json.email_footer_address === 'string') setEmailFooterAddress(json.email_footer_address)
            if (typeof json.ga_measurement_id === 'string') setGaMeasurementId(json.ga_measurement_id)
          }
        })
        .catch(() => {})
    })
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    let cancelled = false
    getAuthHeaders().then((headers) => {
      fetch('/api/admin/emails/automation-status', { credentials: 'include', headers })
        .then((res) => (res.ok ? res.json() : null))
        .then((json) => {
          if (!cancelled && json?.lastRun) setAutomationLastRun(json.lastRun)
        })
        .catch(() => {})
    })
    return () => { cancelled = true }
  }, [])

  const handleSaveEmailFooterAddress = async () => {
    setEmailFooterMessage(null)
    setEmailFooterSaving(true)
    try {
      const headers = await getAuthHeaders()
      const res = await fetch('/api/admin/site-settings', {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify({ email_footer_address: emailFooterAddress }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setEmailFooterMessage({ type: 'error', text: data.error || 'Failed to save' })
        return
      }
      setEmailFooterMessage({ type: 'success', text: 'Email footer address saved. It will appear in all outgoing emails.' })
      setTimeout(() => setEmailFooterMessage(null), 5000)
    } catch {
      setEmailFooterMessage({ type: 'error', text: 'Failed to save email footer address.' })
    } finally {
      setEmailFooterSaving(false)
    }
  }

  const handleSaveGaMeasurementId = async () => {
    setGaMessage(null)
    setGaSaving(true)
    try {
      const headers = await getAuthHeaders()
      const res = await fetch('/api/admin/site-settings', {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify({ ga_measurement_id: gaMeasurementId }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setGaMessage({ type: 'error', text: data.error || 'Failed to save' })
        return
      }
      setGaMessage({ type: 'success', text: 'Analytics measurement ID saved. It will load for users who have accepted cookies.' })
      setTimeout(() => setGaMessage(null), 5000)
    } catch {
      setGaMessage({ type: 'error', text: 'Failed to save Google Analytics ID.' })
    } finally {
      setGaSaving(false)
    }
  }

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
      const statusRes = await fetch('/api/admin/emails/automation-status', { credentials: 'include', headers })
      if (statusRes.ok) {
        const statusJson = await statusRes.json()
        if (statusJson?.lastRun) setAutomationLastRun(statusJson.lastRun)
      }
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
            <Link
              href="/app/admin/emails/log"
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              Email log
            </Link>
          </div>
        </div>

        {/* Activation funnel + insights. Future: add charts here using insights.weeklySignups, cohort retention, or map of places. */}
        <AdminFunnel funnel={funnel} />
        <ProductHealthInsights insights={insights} />

        {/* SEO & Analytics */}
        <div className="mb-8 bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">SEO &amp; Analytics</h2>
          <p className="text-sm text-gray-600 mb-4">
            Google Analytics Measurement ID (e.g. G-XXXXXXXXXX). Leave blank to disable. Analytics only loads for users who have accepted cookies.
          </p>
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex-1 min-w-[200px]">
              <input
                type="text"
                value={gaMeasurementId}
                onChange={(e) => setGaMeasurementId(e.target.value)}
                placeholder="G-XXXXXXXXXX"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                aria-label="Google Analytics Measurement ID"
              />
            </div>
            <button
              type="button"
              onClick={handleSaveGaMeasurementId}
              disabled={gaSaving}
              className="px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-gray-800 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50 disabled:pointer-events-none"
            >
              {gaSaving ? 'Saving…' : 'Save'}
            </button>
          </div>
          {gaMessage && (
            <p className={`mt-3 text-sm ${gaMessage.type === 'success' ? 'text-green-700' : 'text-red-600'}`} role="alert">
              {gaMessage.text}
            </p>
          )}
        </div>

        {/* Email footer address (CAN-SPAM) */}
        <div className="mb-8 bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Email footer address</h2>
          <p className="text-sm text-gray-600 mb-4">
            Physical address shown at the bottom of all emails (CAN-SPAM). Leave blank to hide.
          </p>
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex-1 min-w-[200px]">
              <input
                type="text"
                value={emailFooterAddress}
                onChange={(e) => setEmailFooterAddress(e.target.value)}
                placeholder="e.g. FiBi, 123 Street, City, Country"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                aria-label="Email footer address"
              />
            </div>
            <button
              type="button"
              onClick={handleSaveEmailFooterAddress}
              disabled={emailFooterSaving}
              className="px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-gray-800 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50 disabled:pointer-events-none"
            >
              {emailFooterSaving ? 'Saving…' : 'Save'}
            </button>
          </div>
          {emailFooterMessage && (
            <p className={`mt-3 text-sm ${emailFooterMessage.type === 'success' ? 'text-green-700' : 'text-red-600'}`} role="alert">
              {emailFooterMessage.text}
            </p>
          )}
        </div>

        <EmailAutomationPanel
          isRunning={automationsRunning}
          lastRun={automationLastRun}
          runResult={automationsResult}
          onRun={handleRunAutomations}
        />

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

