'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import DOMPurify from 'dompurify'
import { wrapEmailWithLayout } from '@/lib/email-layout'
import { getAdminAuthHeaders } from '@/lib/admin-auth-headers'

interface Campaign {
  id: string
  name: string
  template_slug: string
  segment_id: string | null
  filters: Record<string, unknown> | null
  status: string
  scheduled_at: string | null
  started_at: string | null
  completed_at: string | null
  audience_count: number
  sent_count: number
  failed_count: number
  opened_count: number
  clicked_count: number
  bounced_count: number
  unsubscribed_count: number
  subject: string | null
  preview_text: string | null
  from_name: string | null
  from_email: string | null
  created_at?: string
}

type Tab = 'overview' | 'email' | 'report'

function pct(n: number, d: number): string {
  if (d <= 0) return '—'
  return `${((n / d) * 100).toFixed(1)}%`
}

function statusBadgeClass(status: string): string {
  switch (status) {
    case 'sent':
      return 'bg-emerald-100 text-emerald-800'
    case 'scheduled':
      return 'bg-sky-100 text-sky-800'
    case 'sending':
      return 'bg-amber-100 text-amber-800'
    case 'failed':
      return 'bg-red-100 text-red-800'
    case 'cancelled':
      return 'bg-gray-100 text-gray-600'
    default:
      return 'bg-gray-100 text-gray-700'
  }
}

export default function EmailCampaignDetailClient({ campaignId }: { campaignId: string }) {
  const [campaign, setCampaign] = useState<Campaign | null>(null)
  const [segmentName, setSegmentName] = useState<string | null>(null)
  const [htmlPreview, setHtmlPreview] = useState('')
  const [tab, setTab] = useState<Tab>('overview')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sending, setSending] = useState(false)
  const [actionMessage, setActionMessage] = useState<string | null>(null)

  const getAuthHeaders = useCallback(async () => getAdminAuthHeaders(), [])

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const headers = await getAuthHeaders()
      const res = await fetch(`/api/admin/emails/campaigns/${campaignId}`, {
        credentials: 'include',
        headers,
      })
      if (!res.ok) {
        setError(res.status === 404 ? 'Campaign not found' : 'Could not load campaign')
        return
      }
      const data = await res.json()
      const c = data.campaign as Campaign
      setCampaign(c)

      if (c.segment_id) {
        const segRes = await fetch(`/api/admin/emails/segments/${c.segment_id}`, {
          credentials: 'include',
          headers,
        })
        if (segRes.ok) {
          const segData = await segRes.json()
          setSegmentName(segData.segment?.name ?? null)
        }
      } else {
        setSegmentName(null)
      }

      if (c.template_slug) {
        const tRes = await fetch(`/api/admin/emails/templates/${encodeURIComponent(c.template_slug)}`, {
          credentials: 'include',
          headers,
        })
        if (tRes.ok) {
          const t = await tRes.json()
          const body = typeof t.html_content === 'string' ? t.html_content : ''
          const preview =
            c.preview_text?.trim()
              ? `<div style="display:none;font-size:1px;color:#fff;max-height:0;overflow:hidden;">${c.preview_text.replace(/</g, '')}</div>${body}`
              : body
          setHtmlPreview(wrapEmailWithLayout(preview))
        }
      }
    } catch {
      setError('Could not load campaign')
    } finally {
      setLoading(false)
    }
  }, [campaignId, getAuthHeaders])

  useEffect(() => {
    load()
  }, [load])

  const sendNow = async () => {
    if (!campaign || !confirm('Send this campaign now?')) return
    setSending(true)
    setActionMessage(null)
    try {
      const headers = await getAuthHeaders()
      const res = await fetch(`/api/admin/emails/campaigns/${campaign.id}/send`, {
        method: 'POST',
        credentials: 'include',
        headers,
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setActionMessage(data.error || 'Send failed')
        return
      }
      setActionMessage(`Sent ${data.sent ?? 0}, skipped ${data.skipped ?? 0}, failed ${data.failed ?? 0}`)
      await load()
    } finally {
      setSending(false)
    }
  }

  const cancelCampaign = async () => {
    if (!campaign || !confirm('Cancel this campaign?')) return
    const headers = await getAuthHeaders()
    await fetch(`/api/admin/emails/campaigns/${campaign.id}`, {
      method: 'PATCH',
      credentials: 'include',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'cancelled' }),
    })
    await load()
  }

  if (loading) {
    return <div className="text-gray-500 text-sm">Loading campaign…</div>
  }

  if (error || !campaign) {
    return (
      <div>
        <p className="text-red-600 text-sm" role="alert">
          {error || 'Not found'}
        </p>
        <Link href="/app/admin/emails/campaigns" className="text-sm underline mt-2 inline-block">
          ← Back to campaigns
        </Link>
      </div>
    )
  }

  const sanitized = DOMPurify.sanitize(htmlPreview, {
    ALLOWED_TAGS: [
      'p', 'br', 'strong', 'em', 'a', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'div', 'span', 'img',
      'table', 'tr', 'td', 'tbody', 'thead', 'th', 'body', 'html', 'head', 'meta', 'hr',
    ],
    ALLOWED_ATTR: ['href', 'target', 'rel', 'src', 'alt', 'style', 'width', 'height', 'cellpadding', 'cellspacing', 'border', 'align', 'role'],
  })

  const canSend = ['draft', 'scheduled', 'failed'].includes(campaign.status)
  const canCancel = ['draft', 'scheduled'].includes(campaign.status)

  const tabs: { id: Tab; label: string }[] = [
    { id: 'overview', label: 'Settings' },
    { id: 'email', label: 'Email' },
    { id: 'report', label: 'Report' },
  ]

  return (
    <div>
      <div className="mb-6">
        <Link href="/app/admin/emails/campaigns" className="text-sm text-gray-600 hover:text-gray-900">
          ← Campaigns
        </Link>
        <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{campaign.name}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span
                className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${statusBadgeClass(campaign.status)}`}
              >
                {campaign.status}
              </span>
              {campaign.scheduled_at && campaign.status === 'scheduled' && (
                <span className="text-sm text-gray-500">
                  Scheduled {new Date(campaign.scheduled_at).toLocaleString()}
                </span>
              )}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {canSend && (
              <button
                type="button"
                onClick={sendNow}
                disabled={sending}
                className="px-4 py-2 text-sm font-medium text-white bg-gray-900 rounded-md hover:bg-gray-800 disabled:opacity-50"
              >
                {sending ? 'Sending…' : 'Send now'}
              </button>
            )}
            {canCancel && (
              <button
                type="button"
                onClick={cancelCampaign}
                className="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel campaign
              </button>
            )}
          </div>
        </div>
        {actionMessage && (
          <p className="mt-3 text-sm text-gray-700" role="status">
            {actionMessage}
          </p>
        )}
      </div>

      <div className="border-b border-gray-200 mb-6">
        <nav className="flex gap-4" aria-label="Campaign sections">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`pb-3 text-sm font-medium border-b-2 -mb-px ${
                tab === t.id
                  ? 'border-gray-900 text-gray-900'
                  : 'border-transparent text-gray-500 hover:text-gray-800'
              }`}
            >
              {t.label}
            </button>
          ))}
        </nav>
      </div>

      {tab === 'overview' && (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-lg border border-gray-200 bg-white p-5 space-y-3 text-sm">
            <h2 className="text-base font-semibold text-gray-900">Delivery settings</h2>
            <p>
              <span className="text-gray-500">To:</span>{' '}
              {segmentName
                ? `Segment — ${segmentName}`
                : campaign.segment_id
                  ? 'Saved segment'
                  : campaign.filters && Object.keys(campaign.filters).length
                    ? 'Custom filters'
                    : 'All marketing-opted-in users'}
            </p>
            <p>
              <span className="text-gray-500">From:</span>{' '}
              {campaign.from_name || 'FiBi'} &lt;{campaign.from_email || 'hello@fibi.world'}&gt;
            </p>
            <p>
              <span className="text-gray-500">Subject:</span> {campaign.subject || '—'}
            </p>
            <p>
              <span className="text-gray-500">Preview text:</span> {campaign.preview_text || '—'}
            </p>
            <p>
              <span className="text-gray-500">Template:</span>{' '}
              <Link
                href="/app/admin/emails/templates"
                className="underline font-mono text-xs"
              >
                {campaign.template_slug}
              </Link>
            </p>
            {campaign.filters && Object.keys(campaign.filters).length > 0 && (
              <div>
                <p className="text-gray-500 mb-1">Filters</p>
                <pre className="text-xs bg-gray-50 rounded p-3 overflow-x-auto">
                  {JSON.stringify(campaign.filters, null, 2)}
                </pre>
              </div>
            )}
          </div>

          <div className="rounded-lg border border-gray-200 bg-white p-5 text-sm">
            <h2 className="text-base font-semibold text-gray-900 mb-3">Inbox preview</h2>
            <p className="font-medium text-gray-900">{campaign.from_name || 'FiBi'}</p>
            <p className="font-semibold text-gray-800">{campaign.subject || 'No subject'}</p>
            <p className="text-gray-500">{campaign.preview_text || 'No preview text'}</p>
            <button
              type="button"
              onClick={() => setTab('email')}
              className="mt-4 text-sm underline text-gray-700"
            >
              View full email →
            </button>
          </div>
        </div>
      )}

      {tab === 'email' && (
        <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
          <div className="border-b border-gray-100 px-4 py-3 bg-gray-50 text-sm text-gray-600">
            Subject: <span className="text-gray-900 font-medium">{campaign.subject || '—'}</span>
          </div>
          {htmlPreview ? (
            <div
              className="p-4 max-h-[70vh] overflow-y-auto bg-[#f3f4f6]"
              dangerouslySetInnerHTML={{ __html: sanitized }}
            />
          ) : (
            <p className="p-6 text-sm text-gray-500">No template content to preview.</p>
          )}
        </div>
      )}

      {tab === 'report' && (
        <div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            <div className="rounded-lg border border-gray-200 bg-white p-4">
              <p className="text-xs text-gray-500">Sent</p>
              <p className="text-xl font-semibold text-gray-900">
                {campaign.sent_count}
                {campaign.audience_count > 0 ? (
                  <span className="text-sm font-normal text-gray-400"> / {campaign.audience_count}</span>
                ) : null}
              </p>
            </div>
            <div className="rounded-lg border border-gray-200 bg-white p-4">
              <p className="text-xs text-gray-500">Open rate</p>
              <p className="text-xl font-semibold text-gray-900">
                {pct(campaign.opened_count, campaign.sent_count)}
              </p>
            </div>
            <div className="rounded-lg border border-gray-200 bg-white p-4">
              <p className="text-xs text-gray-500">Click rate</p>
              <p className="text-xl font-semibold text-gray-900">
                {pct(campaign.clicked_count, campaign.sent_count)}
              </p>
            </div>
            <div className="rounded-lg border border-gray-200 bg-white p-4">
              <p className="text-xs text-gray-500">Bounce / unsub</p>
              <p className="text-xl font-semibold text-gray-900">
                {pct(campaign.bounced_count, campaign.sent_count)}
                <span className="text-sm font-normal text-gray-400">
                  {' '}
                  / {pct(campaign.unsubscribed_count, campaign.sent_count)}
                </span>
              </p>
            </div>
          </div>
          <p className="text-sm text-gray-600">
            Failed sends: <strong>{campaign.failed_count}</strong>
            {campaign.completed_at && (
              <> · Completed {new Date(campaign.completed_at).toLocaleString()}</>
            )}
          </p>
          <Link
            href={`/app/admin/emails/log?template_slug=${encodeURIComponent(campaign.template_slug)}`}
            className="inline-block mt-4 text-sm underline text-gray-700"
          >
            Open email log for this template
          </Link>
        </div>
      )}
    </div>
  )
}
