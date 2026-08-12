'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import AudienceConditionsForm from '@/components/admin/AudienceConditionsForm'
import { type ConditionsForm, formToConditions } from '@/lib/email-conditions'
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

/** Mailchimp-style steps: To → Setup → Content → Confirm */
type Step = 'to' | 'setup' | 'content' | 'confirm'

const STEPS: { id: Step; label: string }[] = [
  { id: 'to', label: 'To' },
  { id: 'setup', label: 'Setup' },
  { id: 'content', label: 'Content' },
  { id: 'confirm', label: 'Confirm' },
]

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

export default function EmailCampaignsClient() {
  const router = useRouter()
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [templates, setTemplates] = useState<TemplateOption[]>([])
  const [segments, setSegments] = useState<SegmentOption[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [wizardOpen, setWizardOpen] = useState(false)
  const [step, setStep] = useState<Step>('to')

  // To
  const [segmentId, setSegmentId] = useState('')
  const [conditions, setConditions] = useState<ConditionsForm>({})
  const [recipientCount, setRecipientCount] = useState<number | null>(null)
  const [marketingOptInTotal, setMarketingOptInTotal] = useState<number | null>(null)

  // Setup
  const [name, setName] = useState('')
  const [fromName, setFromName] = useState('FIBI')
  const [fromEmail, setFromEmail] = useState('hello@fibi.world')
  const [subject, setSubject] = useState('')
  const [previewText, setPreviewText] = useState('')

  // Content
  const [templateSlug, setTemplateSlug] = useState('')

  // Confirm
  const [scheduleMode, setScheduleMode] = useState<'now' | 'later'>('now')
  const [scheduledAt, setScheduledAt] = useState('')
  const [saving, setSaving] = useState(false)
  const [sendingId, setSendingId] = useState<string | null>(null)
  const [copyingId, setCopyingId] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)


  const refresh = useCallback(async () => {
    const headers = await getAdminAuthHeaders()
    const [cRes, tRes, sRes] = await Promise.all([
      fetch('/api/admin/emails/campaigns', { credentials: 'include', headers }),
      fetch('/api/admin/emails/templates', { credentials: 'include', headers }),
      fetch('/api/admin/emails/segments', { credentials: 'include', headers }),
    ])
    if (!cRes.ok) {
      setError(cRes.status === 403 ? 'Access denied' : 'Failed to load campaigns')
      return
    }
    const cData = await cRes.json()
    setCampaigns(cData.campaigns ?? [])
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
      setSegments((sData.segments ?? []).map((s: { id: string; name: string }) => ({
        id: s.id,
        name: s.name,
      })))
    }
  }, [])

  useEffect(() => {
    refresh().finally(() => setLoading(false))
  }, [refresh])

  const selectedTemplate = useMemo(
    () => templates.find((t) => t.slug === templateSlug) ?? null,
    [templates, templateSlug]
  )

  const audienceLabel = useMemo(() => {
    if (segmentId) {
      const seg = segments.find((s) => s.id === segmentId)
      return seg ? `Segment: ${seg.name}` : 'Saved segment'
    }
    const keys = Object.keys(formToConditions(conditions))
    if (keys.length === 0) return 'All marketing-opted-in users'
    return `Custom filters (${keys.length})`
  }, [segmentId, segments, conditions])

  const checklist = useMemo(() => {
    const items: { ok: boolean; label: string }[] = [
      {
        ok: recipientCount != null && recipientCount > 0,
        label:
          recipientCount == null
            ? 'Preview recipient count'
            : recipientCount > 0
              ? `${recipientCount} recipient${recipientCount === 1 ? '' : 's'} (marketing opt-in)`
              : marketingOptInTotal === 0
                ? 'Nobody has marketing opt-in — campaigns cannot send yet'
                : 'No recipients match — adjust audience',
      },
      { ok: !!name.trim(), label: name.trim() ? `Campaign: ${name.trim()}` : 'Campaign name' },
      {
        ok: !!fromName.trim() && !!fromEmail.trim() && fromEmail.includes('@'),
        label:
          fromName.trim() && fromEmail.includes('@')
            ? `From: ${fromName.trim()} <${fromEmail.trim()}>`
            : 'From name and email',
      },
      { ok: !!subject.trim(), label: subject.trim() ? `Subject: ${subject.trim()}` : 'Subject line' },
      {
        ok: !!templateSlug,
        label: selectedTemplate
          ? `Content: ${selectedTemplate.name}`
          : 'Choose a template',
      },
      {
        ok: scheduleMode === 'now' || !!scheduledAt,
        label:
          scheduleMode === 'now'
            ? 'Send: immediately'
            : scheduledAt
              ? `Schedule: ${new Date(scheduledAt).toLocaleString()}`
              : 'Pick a send time',
      },
    ]
    return items
  }, [
    recipientCount,
    marketingOptInTotal,
    name,
    fromName,
    fromEmail,
    subject,
    templateSlug,
    selectedTemplate,
    scheduleMode,
    scheduledAt,
  ])

  const allChecklistOk = checklist.every((c) => c.ok)

  const openWizard = () => {
    setWizardOpen(true)
    setStep('to')
    setSegmentId('')
    setConditions({})
    setRecipientCount(null)
    setMarketingOptInTotal(null)
    setName('')
    setFromName('FIBI')
    setFromEmail('hello@fibi.world')
    setSubject('')
    setPreviewText('')
    setTemplateSlug(templates[0]?.slug ?? '')
    if (templates[0]?.subject) setSubject(templates[0].subject)
    setScheduleMode('now')
    setScheduledAt('')
    setFormError(null)
  }

  const buildQueryFromConditions = () => {
    const f = formToConditions(conditions)
    const params = new URLSearchParams()
    if (f.confirmed === true) params.set('confirmed', '1')
    if (typeof f.places_count_gt === 'number') params.set('places_count_gt', String(f.places_count_gt))
    if (typeof f.places_count_lt === 'number') params.set('places_count_lt', String(f.places_count_lt))
    if (typeof f.itineraries_count_gt === 'number')
      params.set('itineraries_count_gt', String(f.itineraries_count_gt))
    if (typeof f.last_login_days_gt === 'number')
      params.set('last_login_days_gt', String(f.last_login_days_gt))
    if (typeof f.created_days_gt === 'number') params.set('created_days_gt', String(f.created_days_gt))
    if (typeof f.created_days_lt === 'number') params.set('created_days_lt', String(f.created_days_lt))
    return params.toString()
  }

  const previewAudience = async () => {
    setRecipientCount(null)
    setMarketingOptInTotal(null)
    const headers = await getAdminAuthHeaders()
    let qs = ''
    if (segmentId) {
      const segRes = await fetch(`/api/admin/emails/segments/${segmentId}`, {
        credentials: 'include',
        headers,
      })
      if (segRes.ok) {
        const segData = await segRes.json()
        const c = (segData.segment?.conditions ?? {}) as Record<string, unknown>
        const params = new URLSearchParams()
        if (c.confirmed === true) params.set('confirmed', '1')
        if (typeof c.places_count_gt === 'number') params.set('places_count_gt', String(c.places_count_gt))
        if (typeof c.places_count_lt === 'number') params.set('places_count_lt', String(c.places_count_lt))
        if (typeof c.itineraries_count_gt === 'number')
          params.set('itineraries_count_gt', String(c.itineraries_count_gt))
        if (typeof c.last_login_days_gt === 'number')
          params.set('last_login_days_gt', String(c.last_login_days_gt))
        if (typeof c.created_days_gt === 'number') params.set('created_days_gt', String(c.created_days_gt))
        if (typeof c.created_days_lt === 'number') params.set('created_days_lt', String(c.created_days_lt))
        qs = params.toString()
      }
    } else {
      qs = buildQueryFromConditions()
    }
    const res = await fetch(`/api/admin/emails/recipients${qs ? `?${qs}` : ''}`, {
      credentials: 'include',
      headers,
    })
    if (res.ok) {
      const data = await res.json()
      setRecipientCount(data.count ?? 0)
      setMarketingOptInTotal(
        typeof data.marketing_opt_in_total === 'number' ? data.marketing_opt_in_total : null
      )
    }
  }

  const goNext = async () => {
    setFormError(null)
    if (step === 'to') {
      if (recipientCount == null) await previewAudience()
      setStep('setup')
      return
    }
    if (step === 'setup') {
      if (!name.trim()) {
        setFormError('Add a campaign name')
        return
      }
      if (!subject.trim()) {
        setFormError('Add a subject line')
        return
      }
      if (!fromName.trim() || !fromEmail.includes('@')) {
        setFormError('Check the from name and email')
        return
      }
      setStep('content')
      return
    }
    if (step === 'content') {
      if (!templateSlug) {
        setFormError('Choose a template')
        return
      }
      if (recipientCount == null) await previewAudience()
      setStep('confirm')
    }
  }

  const goBack = () => {
    setFormError(null)
    if (step === 'setup') setStep('to')
    else if (step === 'content') setStep('setup')
    else if (step === 'confirm') setStep('content')
  }

  const createAndMaybeSend = async () => {
    if (!allChecklistOk) {
      setFormError('Finish the checklist items before sending')
      return
    }
    setSaving(true)
    setFormError(null)
    try {
      const headers = await getAdminAuthHeaders()
      const body: Record<string, unknown> = {
        name: name.trim(),
        template_slug: templateSlug,
        segment_id: segmentId || null,
        filters: segmentId ? null : formToConditions(conditions),
        subject: subject.trim(),
        preview_text: previewText.trim() || null,
        from_name: fromName.trim(),
        from_email: fromEmail.trim(),
      }
      if (scheduleMode === 'later') {
        body.status = 'scheduled'
        body.scheduled_at = new Date(scheduledAt).toISOString()
      } else {
        body.status = 'draft'
      }

      const res = await fetch('/api/admin/emails/campaigns', {
        method: 'POST',
        credentials: 'include',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setFormError(data.error || 'Could not create campaign')
        return
      }

      const campaignId = data.campaign?.id as string
      if (scheduleMode === 'now' && campaignId) {
        setSendingId(campaignId)
        const sendRes = await fetch(`/api/admin/emails/campaigns/${campaignId}/send`, {
          method: 'POST',
          credentials: 'include',
          headers,
        })
        const sendData = await sendRes.json().catch(() => ({}))
        setSendingId(null)
        if (!sendRes.ok) {
          const detail =
            Array.isArray(sendData.errors) && sendData.errors.length
              ? sendData.errors.join(' · ')
              : sendData.error || 'Send failed'
          setFormError(detail)
          await refresh()
          return
        }
      }

      setWizardOpen(false)
      await refresh()
    } catch {
      setFormError('That didn\'t work. Try again.')
    } finally {
      setSaving(false)
      setSendingId(null)
    }
  }

  const sendNow = async (id: string) => {
    const campaign = campaigns.find((c) => c.id === id)
    const audience = campaign?.audience_count
    const ok = window.confirm(
      audience && audience > 0
        ? `Send this campaign now to about ${audience} people (marketing opt-in only)?`
        : 'Send this campaign now to the matched audience (marketing opt-in only)?'
    )
    if (!ok) return
    setSendingId(id)
    try {
      const headers = await getAdminAuthHeaders()
      const res = await fetch(`/api/admin/emails/campaigns/${id}/send`, {
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
        setError(detail)
      }
      await refresh()
    } finally {
      setSendingId(null)
    }
  }

  const cancelCampaign = async (id: string) => {
    const headers = await getAdminAuthHeaders()
    await fetch(`/api/admin/emails/campaigns/${id}`, {
      method: 'PATCH',
      credentials: 'include',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'cancelled' }),
    })
    await refresh()
  }

  const copyCampaign = async (id: string) => {
    setCopyingId(id)
    setError(null)
    try {
      const headers = await getAdminAuthHeaders()
      const res = await fetch(`/api/admin/emails/campaigns/${id}/copy`, {
        method: 'POST',
        credentials: 'include',
        headers,
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data.error || 'Could not copy campaign')
        return
      }
      const newId = data.campaign?.id as string | undefined
      if (newId) {
        router.push(`/app/admin/emails/campaigns/${newId}`)
        return
      }
      await refresh()
    } catch {
      setError('Could not copy campaign')
    } finally {
      setCopyingId(null)
    }
  }

  const onSelectTemplate = (slug: string) => {
    setTemplateSlug(slug)
    const t = templates.find((x) => x.slug === slug)
    if (t?.subject && (!subject.trim() || subject === selectedTemplate?.subject)) {
      setSubject(t.subject)
    }
  }

  if (loading) return <div className="text-gray-500">Loading…</div>
  if (error && campaigns.length === 0) return <p className="text-red-600">{error}</p>

  const stepIndex = STEPS.findIndex((s) => s.id === step)

  return (
    <div>
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Campaigns</h1>
          <p className="mt-1 text-sm text-gray-600">
            Regular email campaigns — To, Setup, Content, then Confirm. Same shape as Mailchimp.
          </p>
        </div>
        <button
          type="button"
          onClick={openWizard}
          className="px-4 py-2 text-sm font-medium text-white bg-accent rounded-md hover:bg-accent-hover"
        >
          Create campaign
        </button>
      </div>

      {wizardOpen && (
        <div className="mb-8 rounded-lg border border-gray-200 bg-white shadow-sm overflow-hidden">
          {/* Step progress */}
          <div className="border-b border-gray-200 bg-gray-50 px-6 py-4">
            <ol className="flex flex-wrap gap-2 sm:gap-0 sm:justify-between">
              {STEPS.map((s, i) => {
                const done = i < stepIndex
                const active = s.id === step
                return (
                  <li key={s.id} className="flex items-center gap-2 text-sm">
                    <span
                      className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold ${
                        active
                          ? 'bg-accent text-white'
                          : done
                            ? 'bg-emerald-600 text-white'
                            : 'bg-gray-200 text-gray-600'
                      }`}
                    >
                      {done ? '✓' : i + 1}
                    </span>
                    <span className={active ? 'font-semibold text-gray-900' : 'text-gray-500'}>
                      {s.label}
                    </span>
                    {i < STEPS.length - 1 && (
                      <span className="hidden sm:inline mx-3 text-gray-300">—</span>
                    )}
                  </li>
                )
              })}
            </ol>
          </div>

          <div className="p-6">
            {step === 'to' && (
              <div className="space-y-4 max-w-xl">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">To</h2>
                  <p className="text-sm text-gray-600 mt-1">
                    Who should get this email? Always limited to marketing opt-in.
                  </p>
                </div>
                <label className="block">
                  <span className="text-sm font-medium text-gray-700">Audience</span>
                  <select
                    value={segmentId}
                    onChange={(e) => {
                      setSegmentId(e.target.value)
                      setRecipientCount(null)
                    }}
                    className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm"
                  >
                    <option value="">All opted-in (or custom filters below)</option>
                    {segments.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </label>
                {!segments.length && (
                  <p className="text-xs text-gray-500">
                    Tip:{' '}
                    <Link href="/app/admin/emails/segments" className="underline">
                      Create a segment
                    </Link>{' '}
                    for reusable audiences (e.g. inactive 7d).
                  </p>
                )}
                {!segmentId && (
                  <div className="rounded-lg border border-gray-100 bg-gray-50 p-4">
                    <p className="text-sm font-medium text-gray-800 mb-3">Custom filters</p>
                    <AudienceConditionsForm
                      value={conditions}
                      onChange={(c) => {
                        setConditions(c)
                        setRecipientCount(null)
                      }}
                    />
                  </div>
                )}
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={previewAudience}
                    className="px-3 py-1.5 text-sm border border-gray-300 rounded hover:bg-gray-50"
                  >
                    Preview count
                  </button>
                  {recipientCount != null && (
                    <span className="text-sm text-gray-700 font-medium">
                      {recipientCount} recipient{recipientCount === 1 ? '' : 's'}
                      {marketingOptInTotal != null && (
                        <span className="text-gray-500 font-normal">
                          {' '}
                          · {marketingOptInTotal} with marketing opt-in overall
                        </span>
                      )}
                    </span>
                  )}
                  {recipientCount === 0 && marketingOptInTotal === 0 && (
                    <p className="w-full text-sm text-amber-800 bg-amber-50 rounded-md px-3 py-2">
                      Nobody is opted into marketing yet, so campaigns will not send. Check signup
                      consent or backfill carefully in SQL if older users should receive updates.
                    </p>
                  )}
                </div>
              </div>
            )}

            {step === 'setup' && (
              <div className="space-y-4 max-w-lg">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Setup</h2>
                  <p className="text-sm text-gray-600 mt-1">
                    Campaign name, from details, and what people see in their inbox.
                  </p>
                </div>
                <label className="block">
                  <span className="text-sm font-medium text-gray-700">Campaign name</span>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm"
                    placeholder="March product update"
                  />
                  <span className="text-xs text-gray-500">Internal only — not shown to recipients</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label className="block">
                    <span className="text-sm font-medium text-gray-700">From name</span>
                    <input
                      type="text"
                      value={fromName}
                      onChange={(e) => setFromName(e.target.value)}
                      className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm"
                    />
                  </label>
                  <label className="block">
                    <span className="text-sm font-medium text-gray-700">From email</span>
                    <input
                      type="email"
                      value={fromEmail}
                      onChange={(e) => setFromEmail(e.target.value)}
                      className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm"
                    />
                  </label>
                </div>
                <label className="block">
                  <span className="text-sm font-medium text-gray-700">Subject line</span>
                  <input
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm"
                    placeholder="A calm update from FIBI"
                  />
                </label>
                <label className="block">
                  <span className="text-sm font-medium text-gray-700">Preview text</span>
                  <input
                    type="text"
                    value={previewText}
                    onChange={(e) => setPreviewText(e.target.value)}
                    className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm"
                    placeholder="Shown next to the subject in most inboxes"
                  />
                </label>
                {/* Inbox preview mock */}
                <div className="rounded-lg border border-gray-200 bg-white p-3 text-sm">
                  <p className="text-xs text-gray-500 mb-1">Inbox preview</p>
                  <p className="font-medium text-gray-900 truncate">{fromName || 'FIBI'}</p>
                  <p className="font-semibold text-gray-800 truncate">{subject || 'Subject line'}</p>
                  <p className="text-gray-500 truncate">
                    {previewText || 'Preview text appears here…'}
                  </p>
                </div>
              </div>
            )}

            {step === 'content' && (
              <div className="space-y-4 max-w-lg">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Content</h2>
                  <p className="text-sm text-gray-600 mt-1">
                    Choose a template. Edit templates anytime under Templates.
                  </p>
                </div>
                <label className="block">
                  <span className="text-sm font-medium text-gray-700">Email template</span>
                  <select
                    value={templateSlug}
                    onChange={(e) => onSelectTemplate(e.target.value)}
                    className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm"
                  >
                    <option value="">Select…</option>
                    {templates.map((t) => (
                      <option key={t.slug} value={t.slug}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </label>
                {selectedTemplate && (
                  <div className="rounded-lg border border-gray-100 bg-gray-50 p-4 text-sm text-gray-700">
                    <p>
                      <span className="text-gray-500">Template subject (default):</span>{' '}
                      {selectedTemplate.subject || '—'}
                    </p>
                    <p className="mt-2">
                      <span className="text-gray-500">Campaign subject:</span> {subject || '—'}
                    </p>
                    <Link
                      href="/app/admin/emails/templates"
                      className="inline-block mt-3 text-sm underline text-gray-700"
                    >
                      Edit templates
                    </Link>
                  </div>
                )}
              </div>
            )}

            {step === 'confirm' && (
              <div className="space-y-5 max-w-lg">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Confirm</h2>
                  <p className="text-sm text-gray-600 mt-1">
                    Review everything, then send or schedule.
                  </p>
                </div>

                <ul className="space-y-2">
                  {checklist.map((item) => (
                    <li
                      key={item.label}
                      className={`flex items-start gap-2 text-sm rounded-md px-3 py-2 ${
                        item.ok ? 'bg-emerald-50 text-emerald-900' : 'bg-amber-50 text-amber-900'
                      }`}
                    >
                      <span className="font-semibold">{item.ok ? '✓' : '!'}</span>
                      <span>{item.label}</span>
                    </li>
                  ))}
                </ul>

                <div className="rounded-lg border border-gray-200 p-4 text-sm space-y-1">
                  <p>
                    <span className="text-gray-500">To:</span> {audienceLabel}
                  </p>
                  <p>
                    <span className="text-gray-500">From:</span> {fromName} &lt;{fromEmail}&gt;
                  </p>
                  <p>
                    <span className="text-gray-500">Subject:</span> {subject}
                  </p>
                </div>

                <div className="flex gap-4">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="radio"
                      checked={scheduleMode === 'now'}
                      onChange={() => setScheduleMode('now')}
                    />
                    Send now
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="radio"
                      checked={scheduleMode === 'later'}
                      onChange={() => setScheduleMode('later')}
                    />
                    Schedule for later
                  </label>
                </div>
                {scheduleMode === 'later' && (
                  <label className="block">
                    <span className="text-sm text-gray-700">Send at (your local time)</span>
                    <input
                      type="datetime-local"
                      value={scheduledAt}
                      onChange={(e) => setScheduledAt(e.target.value)}
                      className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm"
                    />
                  </label>
                )}
              </div>
            )}

            {formError && (
              <p className="mt-4 text-sm text-red-600" role="alert">
                {formError}
              </p>
            )}

            <div className="mt-6 flex flex-wrap gap-2 border-t border-gray-100 pt-4">
              {step !== 'to' && (
                <button
                  type="button"
                  onClick={goBack}
                  className="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Back
                </button>
              )}
              {step !== 'confirm' ? (
                <button
                  type="button"
                  onClick={goNext}
                  className="px-4 py-2 text-sm font-medium text-white bg-accent rounded-md hover:bg-accent-hover"
                >
                  Next
                </button>
              ) : (
                <button
                  type="button"
                  onClick={createAndMaybeSend}
                  disabled={saving || !!sendingId || !allChecklistOk}
                  className="px-4 py-2 text-sm font-medium text-white bg-accent rounded-md hover:bg-accent-hover disabled:opacity-50"
                >
                  {saving || sendingId
                    ? 'Working…'
                    : scheduleMode === 'now'
                      ? 'Send campaign'
                      : 'Schedule campaign'}
                </button>
              )}
              <button
                type="button"
                onClick={() => setWizardOpen(false)}
                className="px-4 py-2 text-sm text-gray-600"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Campaign</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Segment</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Audience</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Opened</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {campaigns.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500 text-sm">
                    No campaigns yet. Create one to start.
                  </td>
                </tr>
              ) : (
                campaigns.map((c) => (
                  <tr
                    key={c.id}
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => {
                      router.push(`/app/admin/emails/campaigns/${c.id}`)
                    }}
                  >
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      <Link
                        href={`/app/admin/emails/campaigns/${c.id}`}
                        className="hover:underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {c.name}
                      </Link>
                      <div className="text-xs text-gray-400 font-normal font-mono">{c.template_slug}</div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {segments.find((s) => s.id === c.segment_id)?.name || (c.segment_id ? 'Segment' : 'Custom filters')}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {c.audience_count > 0 ? c.audience_count : c.status === 'draft' ? 'Preview before send' : '—'}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium capitalize ${statusBadgeClass(c.status)}`}
                      >
                        {c.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {c.sent_count > 0 ? pct(c.opened_count, c.sent_count) : '—'}
                    </td>
                    <td
                      className="px-4 py-3 text-sm text-right space-x-2"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Link
                        href={`/app/admin/emails/campaigns/${c.id}`}
                        className="underline text-gray-700 hover:text-gray-900"
                      >
                        Open
                      </Link>
                      <button
                        type="button"
                        onClick={() => copyCampaign(c.id)}
                        disabled={copyingId === c.id}
                        className="underline text-gray-700 hover:text-gray-900 disabled:opacity-50"
                      >
                        {copyingId === c.id ? 'Copying…' : 'Copy'}
                      </button>
                      {(c.status === 'draft' || c.status === 'scheduled' || c.status === 'failed') && (
                        <button
                          type="button"
                          onClick={() => sendNow(c.id)}
                          disabled={sendingId === c.id}
                          className="underline text-gray-700 hover:text-gray-900 disabled:opacity-50"
                        >
                          {sendingId === c.id ? 'Sending…' : 'Send now'}
                        </button>
                      )}
                      {(c.status === 'draft' || c.status === 'scheduled') && (
                        <button
                          type="button"
                          onClick={() => cancelCampaign(c.id)}
                          className="underline text-red-600 hover:text-red-800"
                        >
                          Cancel
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
