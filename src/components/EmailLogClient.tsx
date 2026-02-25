'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

interface LogEntry {
  id: string
  user_id: string
  recipient_email: string | null
  template_slug: string
  automation_id: string | null
  sent_at: string
  status: string
  resend_email_id: string | null
  clicks: number
}

export default function EmailLogClient() {
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [templateFilter, setTemplateFilter] = useState('')
  const [page, setPage] = useState(0)
  const limit = 50

  const getAuthHeaders = useCallback(async (): Promise<Record<string, string>> => {
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (session?.access_token) {
      return { Authorization: `Bearer ${session.access_token}` }
    }
    return {}
  }, [])

  const fetchLog = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const headers = await getAuthHeaders()
      const params = new URLSearchParams()
      params.set('limit', String(limit))
      params.set('offset', String(page * limit))
      if (templateFilter.trim()) params.set('template_slug', templateFilter.trim())
      const res = await fetch(`/api/admin/emails/log?${params.toString()}`, { credentials: 'include', headers })
      if (!res.ok) {
        setError(res.status === 403 ? 'Access denied' : 'Failed to load email log')
        return
      }
      const data = await res.json()
      setLogs(data.logs ?? [])
      setTotal(data.total ?? 0)
    } catch {
      setError('Failed to load email log')
    } finally {
      setLoading(false)
    }
  }, [getAuthHeaders, page, templateFilter])

  useEffect(() => {
    fetchLog()
  }, [fetchLog])

  const formatDate = (s: string) => {
    try {
      const d = new Date(s)
      return d.toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })
    } catch {
      return s
    }
  }

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Email log</h1>
      <p className="text-sm text-gray-600 mb-4">
        Sent emails (automations and one-offs). Click counts appear when Resend click tracking is enabled and the webhook is configured.
      </p>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2">
          <span className="text-sm text-gray-700">Template:</span>
          <input
            type="text"
            value={templateFilter}
            onChange={(e) => {
              setTemplateFilter(e.target.value)
              setPage(0)
            }}
            placeholder="e.g. founding-followup"
            className="rounded border border-gray-300 px-3 py-1.5 text-sm w-48"
          />
        </label>
        <button
          type="button"
          onClick={() => fetchLog()}
          disabled={loading}
          className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50"
        >
          {loading ? 'Loading…' : 'Refresh'}
        </button>
      </div>

      {error && (
        <p className="mb-4 text-sm text-red-600" role="alert">{error}</p>
      )}

      {loading && logs.length === 0 ? (
        <div className="text-gray-500">Loading…</div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Recipient</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Template</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sent</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Clicks</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                      No emails in log yet.
                    </td>
                  </tr>
                ) : (
                  logs.map((row) => (
                    <tr key={row.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {row.recipient_email ?? row.user_id}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500 font-mono">{row.template_slug}</td>
                      <td className="px-6 py-4 text-sm text-gray-500">{formatDate(row.sent_at)}</td>
                      <td className="px-6 py-4 text-sm">
                        <span className={row.status === 'sent' ? 'text-green-600' : 'text-red-600'}>
                          {row.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">{row.clicks}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {total > limit && (
            <div className="px-6 py-3 border-t border-gray-200 flex items-center justify-between text-sm text-gray-600">
              <span>
                {page * limit + 1}–{Math.min((page + 1) * limit, total)} of {total}
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0 || loading}
                  className="text-gray-700 hover:text-gray-900 disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  type="button"
                  onClick={() => setPage((p) => p + 1)}
                  disabled={(page + 1) * limit >= total || loading}
                  className="text-gray-700 hover:text-gray-900 disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
