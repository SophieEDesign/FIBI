'use client'

import { useEffect, useState, useCallback } from 'react'
import { getAdminAuthHeaders } from '@/lib/admin-auth-headers'

interface LogEntry {
  id: string
  user_id: string
  recipient_email: string | null
  recipient_name: string | null
  template_slug: string
  automation_id: string | null
  campaign_id: string | null
  sent_at: string
  status: string
  resend_email_id: string | null
  opened_at: string | null
  bounced_at: string | null
  unsubscribed_at: string | null
  clicks: number
  error_detail?: string | null
}

function recipientLabel(row: LogEntry): { primary: string; secondary: string | null } {
  const email = row.recipient_email?.trim() || null
  const name = row.recipient_name?.trim() || null
  if (name && email) return { primary: name, secondary: email }
  if (email) return { primary: email, secondary: null }
  if (name) return { primary: name, secondary: null }
  return { primary: 'Unknown recipient', secondary: null }
}

interface Stats {
  window_days: number
  sent: number
  opened: number
  clicked: number
  bounced: number
  unsubscribed: number
  open_rate: number | null
  click_rate: number | null
  bounce_rate: number | null
  unsub_rate: number | null
}

function pct(rate: number | null): string {
  if (rate == null) return '—'
  return `${(rate * 100).toFixed(1)}%`
}

function outcomeLabel(row: LogEntry): string {
  if (row.status === 'failed') return 'Failed'
  if (row.bounced_at) return 'Bounced'
  if (row.unsubscribed_at) return 'Unsubscribed'
  if (row.clicks > 0) return 'Clicked'
  if (row.opened_at) return 'Opened'
  return 'Sent'
}

export default function EmailLogClient() {
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [total, setTotal] = useState(0)
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [templateFilter, setTemplateFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'sent' | 'failed'>('all')
  const [page, setPage] = useState(0)
  const limit = 50

  const fetchLog = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const headers = await getAdminAuthHeaders()
      const params = new URLSearchParams()
      params.set('limit', String(limit))
      params.set('offset', String(page * limit))
      if (templateFilter.trim()) params.set('template_slug', templateFilter.trim())
      if (statusFilter !== 'all') params.set('status', statusFilter)
      const res = await fetch(`/api/admin/emails/log?${params.toString()}`, {
        credentials: 'include',
        headers,
      })
      if (!res.ok) {
        setError(res.status === 403 ? 'Access denied' : 'Failed to load email log')
        return
      }
      const data = await res.json()
      setLogs(data.logs ?? [])
      setTotal(data.total ?? 0)
      setStats(data.stats ?? null)
    } catch {
      setError('Failed to load email log')
    } finally {
      setLoading(false)
    }
  }, [page, templateFilter, statusFilter])

  useEffect(() => {
    fetchLog()
  }, [fetchLog])

  const formatDate = (s: string | null) => {
    if (!s) return '—'
    try {
      return new Date(s).toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'short' })
    } catch {
      return s
    }
  }

  return (
    <div>
      <h1 className="mb-2 text-2xl font-semibold text-[#17181A]">Email log</h1>
      <p className="mb-6 text-sm text-[#5C574C]">
        Opens, clicks, bounces and failures — with the provider error when a send fails.
      </p>

      {stats && (
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            ['Open rate', pct(stats.open_rate), `${stats.opened} / ${stats.sent}`],
            ['Click rate', pct(stats.click_rate), `${stats.clicked} clicks`],
            ['Bounce rate', pct(stats.bounce_rate), `${stats.bounced} bounced`],
            ['Unsub rate', pct(stats.unsub_rate), `${stats.unsubscribed} unsubscribed`],
          ].map(([label, value, sub]) => (
            <div
              key={label}
              className="rounded-[14px] border border-[#E5E5E5] bg-white p-4 shadow-[0_1px_2px_rgba(26,26,24,0.06)]"
            >
              <p className="text-xs text-[#8A857A]">{label} ({stats.window_days}d)</p>
              <p className="text-lg font-semibold text-[#17181A]">{value}</p>
              <p className="text-xs text-[#8A857A]">{sub}</p>
            </div>
          ))}
        </div>
      )}

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <input
          type="text"
          value={templateFilter}
          onChange={(e) => {
            setTemplateFilter(e.target.value)
            setPage(0)
          }}
          placeholder="Template slug"
          className="w-48 rounded-full border border-[#E5E5E5] px-3 py-1.5 text-sm"
        />
        <div className="flex gap-1">
          {(['all', 'sent', 'failed'] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => {
                setStatusFilter(s)
                setPage(0)
              }}
              className={`rounded-full px-3 py-1.5 text-sm capitalize transition-colors duration-[130ms] ${
                statusFilter === s
                  ? 'bg-[#E4F4FE] font-medium text-[#14639B]'
                  : 'bg-white text-[#5C574C] border border-[#E5E5E5]'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => fetchLog()}
          disabled={loading}
          className="rounded-full border border-[#E5E5E5] bg-white px-3 py-1.5 text-sm disabled:opacity-50"
        >
          {loading ? 'Loading…' : 'Refresh'}
        </button>
      </div>

      {error && (
        <p className="mb-4 text-sm text-[#9C3226]" role="alert">
          {error}
        </p>
      )}

      {loading && logs.length === 0 ? (
        <div className="text-[#8A857A]">Loading…</div>
      ) : (
        <div className="overflow-hidden rounded-[14px] border border-[#E5E5E5] bg-white shadow-[0_1px_2px_rgba(26,26,24,0.06)]">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-[#E5E5E5]">
              <thead className="bg-[#F5F2EC]">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-[#8A857A]">Recipient</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-[#8A857A]">Template</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-[#8A857A]">Sent</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-[#8A857A]">Outcome</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E5E5]">
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-4 text-center text-[#8A857A]">
                      No emails in log yet.
                    </td>
                  </tr>
                ) : (
                  logs.map((row) => {
                    const failed = row.status === 'failed' || !!row.bounced_at
                    const label = recipientLabel(row)
                    return (
                      <tr
                        key={row.id}
                        className={failed ? 'bg-[#FBE7E5]/60' : 'hover:bg-[#FAF8F3]'}
                      >
                        <td className="px-4 py-3 text-sm text-[#17181A]">
                          <div>
                            <p className="font-medium">{label.primary}</p>
                            {label.secondary ? (
                              <p className="text-xs text-[#8A857A]">{label.secondary}</p>
                            ) : null}
                          </div>
                        </td>
                        <td className="px-4 py-3 font-mono text-sm text-[#5C574C]">
                          {row.template_slug}
                        </td>
                        <td className="px-4 py-3 text-sm text-[#5C574C]">{formatDate(row.sent_at)}</td>
                        <td className="px-4 py-3 text-sm">
                          <span
                            className={
                              failed ? 'font-medium text-[#9C3226]' : 'text-[#17181A]'
                            }
                          >
                            {outcomeLabel(row)}
                          </span>
                          {row.error_detail ? (
                            <p className="mt-0.5 max-w-xs truncate text-xs text-[#9C3226]" title={row.error_detail}>
                              {row.error_detail}
                            </p>
                          ) : null}
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
          {total > limit && (
            <div className="flex items-center justify-between border-t border-[#E5E5E5] px-6 py-3 text-sm text-[#5C574C]">
              <span>
                {page * limit + 1}–{Math.min((page + 1) * limit, total)} of {total}
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0 || loading}
                  className="disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  type="button"
                  onClick={() => setPage((p) => p + 1)}
                  disabled={(page + 1) * limit >= total || loading}
                  className="disabled:opacity-50"
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
