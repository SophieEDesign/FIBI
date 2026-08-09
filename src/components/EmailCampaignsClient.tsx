'use client'

import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import AudienceConditionsForm from '@/components/admin/AudienceConditionsForm'
import { type ConditionsForm, formToConditions } from '@/lib/email-conditions'

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
}

interface TemplateOption {
  slug: string
  name: string
}

interface SegmentOption {
  id: string
  name: string
}

type Step = 1 | 2 | 3

function pct(n: number, d: number): string {
  if (d <= 0) return '—'
  return `${((n / d) * 100).toFixed(1)}%`
}

export default function EmailCampaignsClient() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [templates, setTemplates] = useState<TemplateOption[]>([])
  const [segments, setSegments] = useState<SegmentOption[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [wizardOpen, setWizardOpen] = useState(false)
  const [step, setStep] = useState<Step>(1)
  const [name, setName] = useState('')
  const [templateSlug, setTemplateSlug] = useState('')
  const [segmentId, setSegmentId] = useState('')
  const [conditions, setConditions] = useState<ConditionsForm>({})
  const [scheduleMode, setScheduleMode] = useState<'now' | 'later'>('now')
  const [scheduledAt, setScheduledAt] = useState('')
  const [recipientCount, setRecipientCount] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)
  const [sendingId, setSendingId] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [lastSendResult, setLastSendResult] = useState<string | null>(null)

  const getAuthHeaders = useCallback(async (): Promise<Record<string, string>> => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return {}
    const { data: { session } } = await supabase.auth.getSession()
    if (session?.access_token) return { Authorization: `Bearer ${session.access_token}` }
    return {}
  }, [])

  const refresh = useCallback(async () => {
    const headers = await getAuthHeaders()
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
      setTemplates((tData.templates ?? []).map((t: { slug: string; name: string }) => ({
        slug: t.slug,
        name: t.name,
      })))
    }
    if (sRes.ok) {
      const sData = await sRes.json()
      setSegments((sData.segments ?? []).map((s: { id: string; name: string }) => ({
        id: s.id,
        name: s.name,
      })))
    }
  }, [getAuthHeaders])

  useEffect(() => {
    refresh().finally(() => setLoading(false))
  }, [refresh])

  const openWizard = () => {
    setWizardOpen(true)
    setStep(1)
    setName('')
    setTemplateSlug(templates[0]?.slug ?? '')
    setSegmentId('')
    setConditions({})
    setScheduleMode('now')
    setScheduledAt('')
    setRecipientCount(null)
    setFormError(null)
    setLastSendResult(null)
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
    const headers = await getAuthHeaders()
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
    }
  }

  const createAndMaybeSend = async () => {
    setSaving(true)
    setFormError(null)
    setLastSendResult(null)
    try {
      if (!name.trim() || !templateSlug) {
        setFormError('Name and template are required')
        return
      }
      if (scheduleMode === 'later' && !scheduledAt) {
        setFormError('Pick a send time')
        return
      }

      const headers = await getAuthHeaders()
      const body: Record<string, unknown> = {
        name: name.trim(),
        template_slug: templateSlug,
        segment_id: segmentId || null,
        filters: segmentId ? null : formToConditions(conditions),
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
          setFormError(sendData.error || 'Send failed')
          await refresh()
          return
        }
        setLastSendResult(
          `Sent ${sendData.sent ?? 0}, skipped ${sendData.skipped ?? 0}, failed ${sendData.failed ?? 0}`
        )
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
    if (!confirm('Send this campaign now?')) return
    setSendingId(id)
    try {
      const headers = await getAuthHeaders()
      const res = await fetch(`/api/admin/emails/campaigns/${id}/send`, {
        method: 'POST',
        credentials: 'include',
        headers,
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data.error || 'Send failed')
      }
      await refresh()
    } finally {
      setSendingId(null)
    }
  }

  const cancelCampaign = async (id: string) => {
    const headers = await getAuthHeaders()
    await fetch(`/api/admin/emails/campaigns/${id}`, {
      method: 'PATCH',
      credentials: 'include',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'cancelled' }),
    })
    await refresh()
  }

  if (loading) return <div className="text-gray-500">Loading…</div>
  if (error && campaigns.length === 0) return <p className="text-red-600">{error}</p>

  return (
    <div>
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Campaigns</h1>
          <p className="mt-1 text-sm text-gray-600">
            Compose → audience → schedule or send. Cron checks every 15 minutes.
          </p>
        </div>
        <button
          type="button"
          onClick={openWizard}
          className="px-4 py-2 text-sm font-medium text-white bg-gray-900 rounded-md hover:bg-gray-800"
        >
          New campaign
        </button>
      </div>

      {wizardOpen && (
        <div className="mb-8 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex gap-2 text-sm">
            <span className={step === 1 ? 'font-semibold text-gray-900' : 'text-gray-500'}>1. Compose</span>
            <span className="text-gray-300">→</span>
            <span className={step === 2 ? 'font-semibold text-gray-900' : 'text-gray-500'}>2. Audience</span>
            <span className="text-gray-300">→</span>
            <span className={step === 3 ? 'font-semibold text-gray-900' : 'text-gray-500'}>3. Schedule</span>
          </div>

          {step === 1 && (
            <div className="space-y-4 max-w-lg">
              <label className="block">
                <span className="text-sm text-gray-700">Campaign name</span>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm"
                  placeholder="March product update"
                />
              </label>
              <label className="block">
                <span className="text-sm text-gray-700">Template</span>
                <select
                  value={templateSlug}
                  onChange={(e) => setTemplateSlug(e.target.value)}
                  className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm"
                >
                  <option value="">Select…</option>
                  {templates.map((t) => (
                    <option key={t.slug} value={t.slug}>
                      {t.name} ({t.slug})
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                onClick={() => {
                  if (!name.trim() || !templateSlug) {
                    setFormError('Name and template are required')
                    return
                  }
                  setFormError(null)
                  setStep(2)
                }}
                className="px-4 py-2 text-sm font-medium text-white bg-gray-900 rounded-md"
              >
                Next
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4 max-w-xl">
              <label className="block">
                <span className="text-sm text-gray-700">Saved segment</span>
                <select
                  value={segmentId}
                  onChange={(e) => {
                    setSegmentId(e.target.value)
                    setRecipientCount(null)
                  }}
                  className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm"
                >
                  <option value="">Custom filters…</option>
                  {segments.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </label>
              {!segmentId && (
                <AudienceConditionsForm value={conditions} onChange={setConditions} />
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
                  <span className="text-sm text-gray-600">{recipientCount} recipients</span>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="px-4 py-2 text-sm border border-gray-300 rounded-md"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="px-4 py-2 text-sm font-medium text-white bg-gray-900 rounded-md"
                >
                  Next
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4 max-w-lg">
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
                  Schedule
                </label>
              </div>
              {scheduleMode === 'later' && (
                <label className="block">
                  <span className="text-sm text-gray-700">Send at (local time)</span>
                  <input
                    type="datetime-local"
                    value={scheduledAt}
                    onChange={(e) => setScheduledAt(e.target.value)}
                    className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm"
                  />
                </label>
              )}
              {formError && (
                <p className="text-sm text-red-600" role="alert">
                  {formError}
                </p>
              )}
              {lastSendResult && (
                <p className="text-sm text-emerald-700" role="status">
                  {lastSendResult}
                </p>
              )}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="px-4 py-2 text-sm border border-gray-300 rounded-md"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={createAndMaybeSend}
                  disabled={saving || !!sendingId}
                  className="px-4 py-2 text-sm font-medium text-white bg-gray-900 rounded-md disabled:opacity-50"
                >
                  {saving || sendingId
                    ? 'Working…'
                    : scheduleMode === 'now'
                      ? 'Create & send'
                      : 'Schedule campaign'}
                </button>
                <button
                  type="button"
                  onClick={() => setWizardOpen(false)}
                  className="px-4 py-2 text-sm text-gray-600"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Template</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sent</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Open</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Click</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Bounce</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Unsub</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {campaigns.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-8 text-center text-gray-500 text-sm">
                    No campaigns yet.
                  </td>
                </tr>
              ) : (
                campaigns.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      {c.name}
                      {c.scheduled_at && c.status === 'scheduled' && (
                        <div className="text-xs text-gray-500 font-normal">
                          {new Date(c.scheduled_at).toLocaleString()}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm font-mono text-gray-500">{c.template_slug}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{c.status}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {c.sent_count}
                      {c.audience_count > 0 ? ` / ${c.audience_count}` : ''}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {pct(c.opened_count, c.sent_count)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {pct(c.clicked_count, c.sent_count)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {pct(c.bounced_count, c.sent_count)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {pct(c.unsubscribed_count, c.sent_count)}
                    </td>
                    <td className="px-4 py-3 text-sm text-right space-x-2">
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
