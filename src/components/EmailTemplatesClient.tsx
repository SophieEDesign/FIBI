'use client'

import { useEffect, useState, useCallback } from 'react'
import DOMPurify from 'dompurify'
import { wrapEmailWithLayout } from '@/lib/email-layout'
import AudienceConditionsForm from '@/components/admin/AudienceConditionsForm'
import EmailBlockEditor from '@/components/admin/EmailBlockEditor'
import { type ConditionsForm, formToConditions } from '@/lib/email-conditions'
import { getAdminAuthHeaders } from '@/lib/admin-auth-headers'

interface Template {
  id: string
  name: string
  slug: string
  subject: string
  html_content?: string
  is_active: boolean
  opened_30d?: number
  created_at?: string
  updated_at?: string
}

interface SegmentOption {
  id: string
  name: string
  conditions: Record<string, unknown>
}

export default function EmailTemplatesClient() {
  const [templates, setTemplates] = useState<Template[]>([])
  const [segments, setSegments] = useState<SegmentOption[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState<Template | null>(null)
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState({ name: '', slug: '', subject: '', html_content: '', is_active: false })
  const [testEmail, setTestEmail] = useState('')
  const [saving, setSaving] = useState(false)
  const [sendingTest, setSendingTest] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [oneOffConditions, setOneOffConditions] = useState<ConditionsForm>({})
  const [selectedSegmentId, setSelectedSegmentId] = useState('')
  const [recipientCount, setRecipientCount] = useState<number | null>(null)
  const [loadingRecipients, setLoadingRecipients] = useState(false)
  const [sendingOneOff, setSendingOneOff] = useState(false)
  const [oneOffResult, setOneOffResult] = useState<{ sent: number; skipped: number; failed: number; errors: string[] } | null>(null)


  const fetchTemplates = useCallback(async () => {
    try {
      const headers = await getAdminAuthHeaders()
      const res = await fetch('/api/admin/emails/templates', { credentials: 'include', headers })
      if (!res.ok) {
        setError(res.status === 403 ? 'Access denied' : 'Failed to load templates')
        return
      }
      const data = await res.json()
      setTemplates(data.templates ?? [])
    } catch {
      setError('Failed to load templates')
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchSegments = useCallback(async () => {
    try {
      const headers = await getAdminAuthHeaders()
      const res = await fetch('/api/admin/emails/segments', { credentials: 'include', headers })
      if (!res.ok) return
      const data = await res.json()
      setSegments(data.segments ?? [])
    } catch {
      /* ignore */
    }
  }, [])

  useEffect(() => {
    fetchTemplates()
    fetchSegments()
  }, [fetchTemplates, fetchSegments])

  const slugify = (s: string) =>
    s.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-_]/g, '')

  const handleCreate = () => {
    setCreating(true)
    setEditing(null)
    setForm({ name: '', slug: '', subject: '', html_content: '', is_active: false })
    setFormError(null)
    setRecipientCount(null)
    setOneOffResult(null)
  }

  const resolveFilters = useCallback((): Record<string, unknown> | undefined => {
    if (selectedSegmentId) {
      const seg = segments.find((s) => s.id === selectedSegmentId)
      if (seg?.conditions && Object.keys(seg.conditions).length) return seg.conditions
      return undefined
    }
    const f = formToConditions(oneOffConditions)
    return Object.keys(f).length ? f : undefined
  }, [selectedSegmentId, segments, oneOffConditions])

  const buildRecipientsQuery = useCallback(() => {
    const filters = resolveFilters() ?? {}
    const params = new URLSearchParams()
    if (filters.confirmed === true) params.set('confirmed', '1')
    if (typeof filters.places_count_gt === 'number') params.set('places_count_gt', String(filters.places_count_gt))
    if (typeof filters.places_count_lt === 'number') params.set('places_count_lt', String(filters.places_count_lt))
    if (typeof filters.itineraries_count_gt === 'number')
      params.set('itineraries_count_gt', String(filters.itineraries_count_gt))
    if (typeof filters.last_login_days_gt === 'number')
      params.set('last_login_days_gt', String(filters.last_login_days_gt))
    if (typeof filters.created_days_gt === 'number') params.set('created_days_gt', String(filters.created_days_gt))
    if (typeof filters.created_days_lt === 'number') params.set('created_days_lt', String(filters.created_days_lt))
    if (filters.founding_followup_sent === true) params.set('founding_followup_sent', '1')
    if (filters.founding_followup_sent === false) params.set('founding_followup_sent', '0')
    return params.toString()
  }, [resolveFilters])

  const handlePreviewRecipients = useCallback(async () => {
    if (!editing?.slug) return
    setLoadingRecipients(true)
    setRecipientCount(null)
    setOneOffResult(null)
    try {
      const headers = await getAdminAuthHeaders()
      const qs = buildRecipientsQuery()
      const res = await fetch(`/api/admin/emails/recipients${qs ? `?${qs}` : ''}`, { credentials: 'include', headers })
      if (!res.ok) {
        setFormError('Failed to load recipient count')
        return
      }
      const data = await res.json()
      setRecipientCount(data.count ?? 0)
    } catch {
      setFormError('Failed to load recipient count')
    } finally {
      setLoadingRecipients(false)
    }
  }, [editing?.slug,  buildRecipientsQuery])

  const handleSendOneOff = useCallback(async () => {
    const slug = editing?.slug
    if (!slug) return
    const count = recipientCount ?? 0
    if (count <= 0 && !window.confirm('No filters selected — this will send to all marketing-opted-in users. Continue?')) return
    if (count > 0 && !window.confirm(`Send this template to ${count} recipient(s)?`)) return
    setSendingOneOff(true)
    setOneOffResult(null)
    setFormError(null)
    try {
      const headers = await getAdminAuthHeaders()
      const res = await fetch('/api/admin/emails/send-one-off', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify({
          template_slug: slug,
          filters: resolveFilters(),
          segment_id: selectedSegmentId || undefined,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setFormError(data.error ?? 'Failed to send')
        return
      }
      setOneOffResult({
        sent: data.sent ?? 0,
        skipped: data.skipped ?? 0,
        failed: data.failed ?? 0,
        errors: Array.isArray(data.errors) ? data.errors : [],
      })
      setRecipientCount(null)
    } catch {
      setFormError('Failed to send one-off')
    } finally {
      setSendingOneOff(false)
    }
  }, [editing?.slug, recipientCount,  resolveFilters, selectedSegmentId])

  const handleEdit = async (t: Template) => {
    setEditing(t)
    setCreating(false)
    setFormError(null)
    setRecipientCount(null)
    setOneOffResult(null)
    setOneOffConditions({})
    setSelectedSegmentId('')
    setForm({
      name: t.name,
      slug: t.slug,
      subject: t.subject,
      html_content: t.html_content ?? '',
      is_active: t.is_active,
    })
    if (t.html_content === undefined) {
      try {
        const headers = await getAdminAuthHeaders()
        const res = await fetch(`/api/admin/emails/templates/${encodeURIComponent(t.slug)}`, {
          credentials: 'include',
          headers,
        })
        if (res.ok) {
          const full = await res.json()
          setForm((f) => ({ ...f, html_content: full.html_content ?? '' }))
        }
      } catch {
        /* keep */
      }
    }
  }

  const handleCancel = () => {
    setCreating(false)
    setEditing(null)
    setRecipientCount(null)
    setOneOffResult(null)
  }

  const handleSave = async () => {
    setFormError(null)
    if (!form.name.trim() || !form.slug.trim() || !form.subject.trim()) {
      setFormError('Name, slug, and subject are required')
      return
    }
    setSaving(true)
    try {
      const headers = await getAdminAuthHeaders()
      const url = editing
        ? `/api/admin/emails/templates/${encodeURIComponent(editing.slug)}`
        : '/api/admin/emails/templates'
      const method = editing ? 'PATCH' : 'POST'
      const body = editing
        ? { name: form.name.trim(), subject: form.subject.trim(), html_content: form.html_content, is_active: form.is_active }
        : { name: form.name.trim(), slug: form.slug.trim(), subject: form.subject.trim(), html_content: form.html_content, is_active: form.is_active }
      const res = await fetch(url, {
        method,
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify(body),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setFormError(data.error ?? 'Failed to save')
        return
      }
      await fetchTemplates()
      setCreating(false)
      setEditing(null)
    } catch {
      setFormError('Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const handleSendTest = async () => {
    const slug = editing?.slug
    if (!slug) return
    const to = testEmail.trim()
    if (!to || !to.includes('@')) {
      setFormError('Enter a valid email address')
      return
    }
    setSendingTest(true)
    setFormError(null)
    try {
      const headers = await getAdminAuthHeaders()
      const res = await fetch(`/api/admin/emails/templates/${encodeURIComponent(slug)}/send-test`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify({ to }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setFormError(data.error ?? 'Failed to send test')
        return
      }
    } catch {
      setFormError('Failed to send test')
    } finally {
      setSendingTest(false)
    }
  }

  const wrappedForPreview = wrapEmailWithLayout(form.html_content || '')
  const sanitizedPreview = DOMPurify.sanitize(wrappedForPreview, {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'a', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'div', 'span', 'img', 'table', 'tr', 'td', 'tbody', 'body', 'hr'],
    ALLOWED_ATTR: ['href', 'target', 'rel', 'src', 'alt', 'style', 'width', 'height'],
  })

  if (loading) {
    return <div className="text-gray-500">Loading templates…</div>
  }

  if (error) {
    return <div className="text-red-500">{error}</div>
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Email Templates</h1>
        <button
          type="button"
          onClick={handleCreate}
          className="px-4 py-2 text-sm font-medium text-white bg-gray-800 hover:bg-gray-700 rounded"
        >
          New template
        </button>
      </div>

      {(creating || editing) && (
        <div className="mb-8 bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            {editing ? 'Edit template' : 'New template'}
          </h2>
          {formError && (
            <p className="mb-4 text-sm text-red-600" role="alert">{formError}</p>
          )}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
                placeholder="e.g. Welcome Email"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Slug</label>
              <input
                type="text"
                value={form.slug}
                onChange={(e) => setForm((f) => ({ ...f, slug: slugify(e.target.value) }))}
                disabled={!!editing}
                className="w-full rounded border border-gray-300 px-3 py-2 text-sm font-mono disabled:bg-gray-100"
                placeholder="welcome-email"
              />
              {editing && <p className="mt-1 text-xs text-gray-500">Slug cannot be changed after creation</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
              <input
                type="text"
                value={form.subject}
                onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
                className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
                placeholder="Welcome to FIBI"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Content</label>
              <EmailBlockEditor
                value={form.html_content}
                onChange={(html_content) => setForm((f) => ({ ...f, html_content }))}
                disabled={saving}
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_active"
                checked={form.is_active}
                onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
                className="rounded border-gray-300"
              />
              <label htmlFor="is_active" className="text-sm text-gray-700">Active</label>
            </div>
          </div>

          {form.html_content && (
            <div className="mt-6">
              <h3 className="text-sm font-medium text-gray-700 mb-2">Preview</h3>
              <div
                className="border border-gray-200 rounded-lg overflow-hidden bg-gray-50 p-4 max-h-96 overflow-y-auto"
                dangerouslySetInnerHTML={{ __html: sanitizedPreview }}
              />
            </div>
          )}

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 text-sm font-medium text-white bg-gray-800 hover:bg-gray-700 rounded disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
            <button
              type="button"
              onClick={handleCancel}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50"
            >
              Cancel
            </button>
            {editing && (
              <div className="flex items-center gap-2">
                <input
                  type="email"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  placeholder="test@example.com"
                  className="rounded border border-gray-300 px-3 py-2 text-sm w-48"
                />
                <button
                  type="button"
                  onClick={handleSendTest}
                  disabled={sendingTest}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50"
                >
                  {sendingTest ? 'Sending…' : 'Send test'}
                </button>
              </div>
            )}
          </div>

          {editing && (
            <div className="mt-8 pt-6 border-t border-gray-200">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Send one-off</h3>
              <p className="text-sm text-gray-600 mb-3">
                Prefer creating a campaign for scheduled sends. This sends immediately to the audience below.
              </p>
              <label className="block mb-3 max-w-md">
                <span className="text-sm text-gray-700">Saved segment (optional)</span>
                <select
                  value={selectedSegmentId}
                  onChange={(e) => {
                    setSelectedSegmentId(e.target.value)
                    setRecipientCount(null)
                    setOneOffResult(null)
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
              {!selectedSegmentId && (
                <div className="mb-3">
                  <AudienceConditionsForm
                    value={oneOffConditions}
                    onChange={(c) => {
                      setOneOffConditions(c)
                      setRecipientCount(null)
                      setOneOffResult(null)
                    }}
                  />
                </div>
              )}
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={handlePreviewRecipients}
                  disabled={loadingRecipients}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50"
                >
                  {loadingRecipients ? 'Loading…' : 'Preview count'}
                </button>
                {recipientCount !== null && (
                  <span className="text-sm text-gray-600">
                    {recipientCount} recipient{recipientCount !== 1 ? 's' : ''}
                  </span>
                )}
                <button
                  type="button"
                  onClick={handleSendOneOff}
                  disabled={sendingOneOff}
                  className="px-4 py-2 text-sm font-medium text-white bg-gray-800 hover:bg-gray-700 rounded disabled:opacity-50"
                >
                  {sendingOneOff ? 'Sending…' : 'Send now'}
                </button>
              </div>
              {oneOffResult && (
                <p className="mt-3 text-sm text-gray-700">
                  Sent {oneOffResult.sent}, skipped {oneOffResult.skipped}, failed {oneOffResult.failed}
                </p>
              )}
            </div>
          )}
        </div>
      )}

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Slug</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Active</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Opened 30d</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {templates.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-gray-500 text-sm">
                  No templates yet.
                </td>
              </tr>
            ) : (
              templates.map((t) => (
                <tr key={t.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{t.name}</td>
                  <td className="px-6 py-4 text-sm font-mono text-gray-500">{t.slug}</td>
                  <td className="px-6 py-4 text-sm">{t.is_active ? 'Yes' : 'No'}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{t.opened_30d ?? 0}</td>
                  <td className="px-6 py-4 text-sm text-right">
                    <button
                      type="button"
                      onClick={() => handleEdit(t)}
                      className="text-gray-700 hover:text-gray-900 underline"
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
