'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import DOMPurify from 'dompurify'
import { wrapEmailWithLayout } from '@/lib/email-layout'
import { getAdminAuthHeaders } from '@/lib/admin-auth-headers'
import AudienceConditionsForm from '@/components/admin/AudienceConditionsForm'
import EmailBlockEditor from '@/components/admin/EmailBlockEditor'
import {
  type ConditionsForm,
  conditionsToForm,
  formToConditions,
} from '@/lib/email-conditions'

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

interface TemplateOption {
  slug: string
  name: string
  subject: string
}

interface SegmentOption {
  id: string
  name: string
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

function toDatetimeLocalValue(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export default function EmailCampaignDetailClient({ campaignId }: { campaignId: string }) {
  const router = useRouter()
  const [campaign, setCampaign] = useState<Campaign | null>(null)
  const [templates, setTemplates] = useState<TemplateOption[]>([])
  const [segments, setSegments] = useState<SegmentOption[]>([])
  const [htmlPreview, setHtmlPreview] = useState('')
  const [tab, setTab] = useState<Tab>('overview')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sending, setSending] = useState(false)
  const [saving, setSaving] = useState(false)
  const [copying, setCopying] = useState(false)
  const [actionMessage, setActionMessage] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)

  // Editable form
  const [name, setName] = useState('')
  const [fromName, setFromName] = useState('FiBi')
  const [fromEmail, setFromEmail] = useState('hello@fibi.world')
  const [subject, setSubject] = useState('')
  const [previewText, setPreviewText] = useState('')
  const [templateSlug, setTemplateSlug] = useState('')
  const [htmlContent, setHtmlContent] = useState('')
  const [savingEmail, setSavingEmail] = useState(false)
  const [segmentId, setSegmentId] = useState('')
  const [conditions, setConditions] = useState<ConditionsForm>({})
  const [scheduleMode, setScheduleMode] = useState<'draft' | 'later'>('draft')
  const [scheduledAt, setScheduledAt] = useState('')

  const getAuthHeaders = useCallback(async () => getAdminAuthHeaders(), [])

  const applyCampaignToForm = (c: Campaign) => {
    setName(c.name || '')
    setFromName(c.from_name || 'FiBi')
    setFromEmail(c.from_email || 'hello@fibi.world')
    setSubject(c.subject || '')
    setPreviewText(c.preview_text || '')
    setTemplateSlug(c.template_slug || '')
    setSegmentId(c.segment_id || '')
    setConditions(conditionsToForm(c.filters ?? {}))
    if (c.status === 'scheduled' && c.scheduled_at) {
      setScheduleMode('later')
      setScheduledAt(toDatetimeLocalValue(c.scheduled_at))
    } else {
      setScheduleMode('draft')
      setScheduledAt('')
    }
  }

  const loadPreview = async (
    headers: Record<string, string>,
    slug: string,
    preview: string | null
  ) => {
    if (!slug) {
      setHtmlPreview('')
      setHtmlContent('')
      return
    }
    const tRes = await fetch(`/api/admin/emails/templates/${encodeURIComponent(slug)}`, {
      credentials: 'include',
      headers,
    })
    if (!tRes.ok) {
      setHtmlPreview('')
      setHtmlContent('')
      return
    }
    const t = await tRes.json()
    const body = typeof t.html_content === 'string' ? t.html_content : ''
    setHtmlContent(body)
    const withPre =
      preview?.trim()
        ? `<div style="display:none;font-size:1px;color:#fff;max-height:0;overflow:hidden;">${preview.replace(/</g, '')}</div>${body}`
        : body
    setHtmlPreview(wrapEmailWithLayout(withPre))
  }

  const refreshWrappedPreview = (body: string, preview: string | null) => {
    const withPre =
      preview?.trim()
        ? `<div style="display:none;font-size:1px;color:#fff;max-height:0;overflow:hidden;">${preview.replace(/</g, '')}</div>${body}`
        : body
    setHtmlPreview(wrapEmailWithLayout(withPre || ''))
  }

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const headers = await getAuthHeaders()
      const [cRes, tRes, sRes] = await Promise.all([
        fetch(`/api/admin/emails/campaigns/${campaignId}`, { credentials: 'include', headers }),
        fetch('/api/admin/emails/templates', { credentials: 'include', headers }),
        fetch('/api/admin/emails/segments', { credentials: 'include', headers }),
      ])
      if (!cRes.ok) {
        setError(cRes.status === 404 ? 'Campaign not found' : 'Could not load campaign')
        return
      }
      const data = await cRes.json()
      const c = data.campaign as Campaign
      setCampaign(c)
      applyCampaignToForm(c)

      if (tRes.ok) {
        const tData = await tRes.json()
        setTemplates(
          (tData.templates ?? []).map((t: { slug: string; name: string; subject?: string }) => ({
            slug: t.slug,
            name: t.name,
            subject: t.subject ?? '',
          }))
        )
      }
      if (sRes.ok) {
        const sData = await sRes.json()
        setSegments(
          (sData.segments ?? []).map((s: { id: string; name: string }) => ({
            id: s.id,
            name: s.name,
          }))
        )
      }

      await loadPreview(headers, c.template_slug, c.preview_text)
    } catch {
      setError('Could not load campaign')
    } finally {
      setLoading(false)
    }
  }, [campaignId, getAuthHeaders])

  useEffect(() => {
    load()
  }, [load])

  const canEdit = campaign ? ['draft', 'scheduled', 'failed'].includes(campaign.status) : false
  const canSend = campaign ? ['draft', 'scheduled', 'failed'].includes(campaign.status) : false
  const canCancel = campaign ? ['draft', 'scheduled'].includes(campaign.status) : false

  const saveSettings = async () => {
    if (!campaign || !canEdit) return
    setSaving(true)
    setSaveError(null)
    setActionMessage(null)
    try {
      if (!name.trim()) {
        setSaveError('Campaign name is required')
        return
      }
      if (!subject.trim()) {
        setSaveError('Subject line is required')
        return
      }
      if (!templateSlug) {
        setSaveError('Choose a template')
        return
      }
      if (!fromName.trim() || !fromEmail.includes('@')) {
        setSaveError('Check from name and email')
        return
      }
      if (scheduleMode === 'later' && !scheduledAt) {
        setSaveError('Pick a send time, or keep as draft')
        return
      }

      const headers = await getAuthHeaders()
      const body: Record<string, unknown> = {
        name: name.trim(),
        subject: subject.trim(),
        preview_text: previewText.trim() || null,
        from_name: fromName.trim(),
        from_email: fromEmail.trim(),
        template_slug: templateSlug,
        segment_id: segmentId || null,
        filters: segmentId ? null : formToConditions(conditions),
      }

      if (scheduleMode === 'later') {
        body.status = 'scheduled'
        body.scheduled_at = new Date(scheduledAt).toISOString()
      } else {
        body.status = campaign.status === 'failed' ? 'draft' : 'draft'
        body.scheduled_at = null
      }

      const res = await fetch(`/api/admin/emails/campaigns/${campaign.id}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setSaveError(data.error || 'Could not save')
        return
      }
      setActionMessage('Settings saved.')
      await load()
    } catch {
      setSaveError('That didn\'t work. Try again.')
    } finally {
      setSaving(false)
    }
  }

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
        const detail =
          Array.isArray(data.errors) && data.errors.length
            ? data.errors.join(' · ')
            : data.error || 'Send failed'
        setActionMessage(detail)
        await load()
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

  const copyCampaign = async () => {
    if (!campaign) return
    setCopying(true)
    setActionMessage(null)
    setSaveError(null)
    try {
      const headers = await getAuthHeaders()
      const res = await fetch(`/api/admin/emails/campaigns/${campaign.id}/copy`, {
        method: 'POST',
        credentials: 'include',
        headers,
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setSaveError(data.error || 'Could not copy campaign')
        return
      }
      const newId = data.campaign?.id as string | undefined
      if (newId) {
        router.push(`/app/admin/emails/campaigns/${newId}`)
        return
      }
      setActionMessage('Campaign copied.')
      await load()
    } catch {
      setSaveError('That didn\'t work. Try again.')
    } finally {
      setCopying(false)
    }
  }

  const saveEmailContent = async () => {
    if (!campaign || !canEdit) return
    if (!templateSlug) {
      setSaveError('Choose a starting template first, then edit.')
      return
    }
    setSavingEmail(true)
    setSaveError(null)
    setActionMessage(null)
    try {
      const headers = await getAuthHeaders()
      const tRes = await fetch(`/api/admin/emails/templates/${encodeURIComponent(templateSlug)}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ html_content: htmlContent }),
      })
      if (!tRes.ok) {
        const data = await tRes.json().catch(() => ({}))
        setSaveError(data.error || 'Could not save email')
        return
      }

      if (campaign.template_slug !== templateSlug) {
        const cRes = await fetch(`/api/admin/emails/campaigns/${campaign.id}`, {
          method: 'PATCH',
          credentials: 'include',
          headers: { ...headers, 'Content-Type': 'application/json' },
          body: JSON.stringify({ template_slug: templateSlug }),
        })
        if (!cRes.ok) {
          const data = await cRes.json().catch(() => ({}))
          setSaveError(data.error || 'Email saved, but campaign link failed')
          return
        }
      }

      refreshWrappedPreview(htmlContent, previewText)
      setActionMessage('Email saved.')
      await load()
    } catch {
      setSaveError('That didn\'t work. Try again.')
    } finally {
      setSavingEmail(false)
    }
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
    ALLOWED_ATTR: [
      'href', 'target', 'rel', 'src', 'alt', 'style', 'width', 'height', 'cellpadding',
      'cellspacing', 'border', 'align', 'role',
    ],
  })

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
            <button
              type="button"
              onClick={copyCampaign}
              disabled={copying}
              className="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
            >
              {copying ? 'Copying…' : 'Copy campaign'}
            </button>
            {canEdit && (
              <button
                type="button"
                onClick={saveSettings}
                disabled={saving}
                className="px-4 py-2 text-sm font-medium text-white bg-gray-900 rounded-md hover:bg-gray-800 disabled:opacity-50"
              >
                {saving ? 'Saving…' : 'Save settings'}
              </button>
            )}
            {canSend && (
              <button
                type="button"
                onClick={sendNow}
                disabled={sending}
                className="px-4 py-2 text-sm font-medium border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
              >
                {sending ? 'Sending…' : 'Send now'}
              </button>
            )}
            {canCancel && (
              <button
                type="button"
                onClick={cancelCampaign}
                className="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 text-red-700"
              >
                Cancel campaign
              </button>
            )}
          </div>
        </div>
        {actionMessage && (
          <p className="mt-3 text-sm text-emerald-700" role="status">
            {actionMessage}
          </p>
        )}
        {saveError && (
          <p className="mt-3 text-sm text-red-600" role="alert">
            {saveError}
          </p>
        )}
        {!canEdit && (
          <p className="mt-3 text-sm text-gray-500">
            This campaign can&apos;t be edited (already sent or cancelled).
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
          <div className="rounded-lg border border-gray-200 bg-white p-5 space-y-4 text-sm">
            <h2 className="text-base font-semibold text-gray-900">Delivery settings</h2>

            <label className="block">
              <span className="text-gray-700 font-medium">Campaign name</span>
              <input
                type="text"
                value={name}
                disabled={!canEdit}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm disabled:bg-gray-50"
              />
            </label>

            <label className="block">
              <span className="text-gray-700 font-medium">Audience (segment)</span>
              <select
                value={segmentId}
                disabled={!canEdit}
                onChange={(e) => setSegmentId(e.target.value)}
                className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm disabled:bg-gray-50"
              >
                <option value="">Custom filters / all opted-in</option>
                {segments.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </label>

            {!segmentId && (
              <div className="rounded-lg border border-gray-100 bg-gray-50 p-3">
                <p className="text-xs text-gray-500 mb-2">Custom filters</p>
                <AudienceConditionsForm
                  value={conditions}
                  onChange={setConditions}
                  disabled={!canEdit}
                />
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="block">
                <span className="text-gray-700 font-medium">From name</span>
                <input
                  type="text"
                  value={fromName}
                  disabled={!canEdit}
                  onChange={(e) => setFromName(e.target.value)}
                  className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm disabled:bg-gray-50"
                />
              </label>
              <label className="block">
                <span className="text-gray-700 font-medium">From email</span>
                <input
                  type="email"
                  value={fromEmail}
                  disabled={!canEdit}
                  onChange={(e) => setFromEmail(e.target.value)}
                  className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm disabled:bg-gray-50"
                />
              </label>
            </div>

            <label className="block">
              <span className="text-gray-700 font-medium">Subject line</span>
              <input
                type="text"
                value={subject}
                disabled={!canEdit}
                onChange={(e) => setSubject(e.target.value)}
                className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm disabled:bg-gray-50"
              />
            </label>

            <label className="block">
              <span className="text-gray-700 font-medium">Preview text</span>
              <input
                type="text"
                value={previewText}
                disabled={!canEdit}
                onChange={(e) => setPreviewText(e.target.value)}
                className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm disabled:bg-gray-50"
              />
            </label>

            <div className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-3">
              <p className="text-gray-700 font-medium">Email content</p>
              <p className="text-xs text-gray-500 mt-1">
                {templateSlug
                  ? `Using template “${templates.find((t) => t.slug === templateSlug)?.name || templateSlug}”.`
                  : 'No template linked yet.'}{' '}
                Edit the body on the Email tab.
              </p>
              <button
                type="button"
                onClick={() => setTab('email')}
                className="mt-2 text-sm underline text-gray-700"
              >
                Open email editor →
              </button>
            </div>

            {canEdit && (
              <div className="pt-2 border-t border-gray-100 space-y-3">
                <p className="font-medium text-gray-700">Schedule</p>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      checked={scheduleMode === 'draft'}
                      onChange={() => setScheduleMode('draft')}
                    />
                    Keep as draft
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      checked={scheduleMode === 'later'}
                      onChange={() => setScheduleMode('later')}
                    />
                    Schedule for later
                  </label>
                </div>
                {scheduleMode === 'later' && (
                  <input
                    type="datetime-local"
                    value={scheduledAt}
                    onChange={(e) => setScheduledAt(e.target.value)}
                    className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
                  />
                )}
              </div>
            )}

            {canEdit && (
              <button
                type="button"
                onClick={saveSettings}
                disabled={saving}
                className="px-4 py-2 text-sm font-medium text-white bg-gray-900 rounded-md hover:bg-gray-800 disabled:opacity-50"
              >
                {saving ? 'Saving…' : 'Save settings'}
              </button>
            )}
          </div>

          <div className="rounded-lg border border-gray-200 bg-white p-5 text-sm">
            <h2 className="text-base font-semibold text-gray-900 mb-3">Inbox preview</h2>
            <p className="font-medium text-gray-900">{fromName || 'FiBi'}</p>
            <p className="font-semibold text-gray-800">{subject || 'No subject'}</p>
            <p className="text-gray-500">{previewText || 'No preview text'}</p>
            <button
              type="button"
              onClick={() => setTab('email')}
              className="mt-4 text-sm underline text-gray-700"
            >
              Edit email →
            </button>
          </div>
        </div>
      )}

      {tab === 'email' && (
        <div className="space-y-4">
          <div className="rounded-lg border border-gray-200 bg-white p-5 space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-gray-900">Email</h2>
                <p className="text-sm text-gray-600 mt-1">
                  Optionally start from a template, then edit the body here.
                </p>
              </div>
              {canEdit && (
                <button
                  type="button"
                  onClick={saveEmailContent}
                  disabled={savingEmail || !templateSlug}
                  className="px-4 py-2 text-sm font-medium text-white bg-gray-900 rounded-md hover:bg-gray-800 disabled:opacity-50"
                >
                  {savingEmail ? 'Saving…' : 'Save email'}
                </button>
              )}
            </div>

            <label className="block max-w-lg text-sm">
              <span className="text-gray-700 font-medium">Start from template</span>
              <select
                value={templateSlug}
                disabled={!canEdit}
                onChange={async (e) => {
                  const slug = e.target.value
                  setTemplateSlug(slug)
                  const t = templates.find((x) => x.slug === slug)
                  if (t?.subject && !subject.trim()) setSubject(t.subject)
                  const headers = await getAuthHeaders()
                  await loadPreview(headers, slug, previewText)
                }}
                className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm disabled:bg-gray-50"
              >
                <option value="">Select a template…</option>
                {templates.map((t) => (
                  <option key={t.slug} value={t.slug}>
                    {t.name}
                  </option>
                ))}
              </select>
            </label>

            {!templateSlug ? (
              <p className="text-sm text-gray-500">
                Choose a template to load content into the editor.
              </p>
            ) : (
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">Body</p>
                <EmailBlockEditor
                  key={templateSlug}
                  value={htmlContent}
                  onChange={(html) => {
                    setHtmlContent(html)
                    refreshWrappedPreview(html, previewText)
                  }}
                  disabled={!canEdit}
                />
              </div>
            )}
          </div>

          <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
            <div className="border-b border-gray-100 px-4 py-3 bg-gray-50 text-sm text-gray-600">
              Preview · Subject:{' '}
              <span className="text-gray-900 font-medium">{subject || campaign.subject || '—'}</span>
            </div>
            {htmlPreview ? (
              <div
                className="p-4 max-h-[70vh] overflow-y-auto bg-[#f3f4f6]"
                dangerouslySetInnerHTML={{ __html: sanitized }}
              />
            ) : (
              <p className="p-6 text-sm text-gray-500">Nothing to preview yet.</p>
            )}
          </div>
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
