'use client'

import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import AudienceConditionsForm from '@/components/admin/AudienceConditionsForm'
import {
  type ConditionsForm,
  conditionsToForm,
  formToConditions,
} from '@/lib/email-conditions'

interface Segment {
  id: string
  name: string
  description: string
  conditions: Record<string, unknown>
  created_at?: string
  updated_at?: string
}

export default function EmailSegmentsClient() {
  const [segments, setSegments] = useState<Segment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState<Segment | null>(null)
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState({ name: '', description: '', conditions: {} as ConditionsForm })
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [recipientCount, setRecipientCount] = useState<number | null>(null)
  const [loadingCount, setLoadingCount] = useState(false)

  const getAuthHeaders = useCallback(async (): Promise<Record<string, string>> => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return {}
    const { data: { session } } = await supabase.auth.getSession()
    if (session?.access_token) return { Authorization: `Bearer ${session.access_token}` }
    return {}
  }, [])

  const fetchSegments = useCallback(async () => {
    try {
      const headers = await getAuthHeaders()
      const res = await fetch('/api/admin/emails/segments', { credentials: 'include', headers })
      if (!res.ok) {
        setError(res.status === 403 ? 'Access denied' : 'Failed to load segments')
        return
      }
      const data = await res.json()
      setSegments(data.segments ?? [])
    } catch {
      setError('Failed to load segments')
    } finally {
      setLoading(false)
    }
  }, [getAuthHeaders])

  useEffect(() => {
    fetchSegments()
  }, [fetchSegments])

  const buildQuery = (conditions: ConditionsForm) => {
    const c = formToConditions(conditions)
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
    if (c.founding_followup_sent === true) params.set('founding_followup_sent', '1')
    if (c.founding_followup_sent === false) params.set('founding_followup_sent', '0')
    return params.toString()
  }

  const previewCount = async () => {
    setLoadingCount(true)
    setRecipientCount(null)
    try {
      const headers = await getAuthHeaders()
      const qs = buildQuery(form.conditions)
      const res = await fetch(`/api/admin/emails/recipients${qs ? `?${qs}` : ''}`, {
        credentials: 'include',
        headers,
      })
      if (!res.ok) return
      const data = await res.json()
      setRecipientCount(typeof data.count === 'number' ? data.count : 0)
    } finally {
      setLoadingCount(false)
    }
  }

  const openCreate = () => {
    setCreating(true)
    setEditing(null)
    setForm({ name: '', description: '', conditions: {} })
    setFormError(null)
    setRecipientCount(null)
  }

  const openEdit = (s: Segment) => {
    setEditing(s)
    setCreating(false)
    setForm({
      name: s.name,
      description: s.description || '',
      conditions: conditionsToForm(s.conditions),
    })
    setFormError(null)
    setRecipientCount(null)
  }

  const save = async () => {
    setSaving(true)
    setFormError(null)
    try {
      const headers = await getAuthHeaders()
      const payload = {
        name: form.name.trim(),
        description: form.description.trim(),
        conditions: formToConditions(form.conditions),
      }
      if (!payload.name) {
        setFormError('Name is required')
        return
      }
      const res = editing
        ? await fetch(`/api/admin/emails/segments/${editing.id}`, {
            method: 'PATCH',
            credentials: 'include',
            headers: { ...headers, 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          })
        : await fetch('/api/admin/emails/segments', {
            method: 'POST',
            credentials: 'include',
            headers: { ...headers, 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setFormError(data.error || 'Save failed')
        return
      }
      setCreating(false)
      setEditing(null)
      await fetchSegments()
    } catch {
      setFormError('Save failed')
    } finally {
      setSaving(false)
    }
  }

  const remove = async (id: string) => {
    if (!confirm('Delete this segment?')) return
    const headers = await getAuthHeaders()
    await fetch(`/api/admin/emails/segments/${id}`, {
      method: 'DELETE',
      credentials: 'include',
      headers,
    })
    await fetchSegments()
  }

  if (loading) {
    return <div className="text-gray-500">Loading…</div>
  }

  if (error) {
    return <p className="text-red-600" role="alert">{error}</p>
  }

  const showForm = creating || editing

  return (
    <div>
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Segments</h1>
          <p className="mt-1 text-sm text-gray-600">
            Named audiences for campaigns. Filters always respect marketing opt-in.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="px-4 py-2 text-sm font-medium text-white bg-gray-900 rounded-md hover:bg-gray-800"
        >
          New segment
        </button>
      </div>

      {showForm && (
        <div className="mb-8 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            {editing ? 'Edit segment' : 'New segment'}
          </h2>
          <div className="space-y-4 max-w-xl">
            <label className="block">
              <span className="text-sm text-gray-700">Name</span>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm"
              />
            </label>
            <label className="block">
              <span className="text-sm text-gray-700">Description</span>
              <input
                type="text"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm"
              />
            </label>
            <AudienceConditionsForm
              value={form.conditions}
              onChange={(conditions) => setForm({ ...form, conditions })}
              disabled={saving}
            />
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={previewCount}
                disabled={loadingCount}
                className="px-3 py-1.5 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50"
              >
                {loadingCount ? 'Counting…' : 'Preview count'}
              </button>
              {recipientCount != null && (
                <span className="text-sm text-gray-600">{recipientCount} recipients</span>
              )}
            </div>
            {formError && (
              <p className="text-sm text-red-600" role="alert">
                {formError}
              </p>
            )}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={save}
                disabled={saving}
                className="px-4 py-2 text-sm font-medium text-white bg-gray-900 rounded-md hover:bg-gray-800 disabled:opacity-50"
              >
                {saving ? 'Saving…' : 'Save'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setCreating(false)
                  setEditing(null)
                }}
                className="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {segments.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-6 py-8 text-center text-gray-500 text-sm">
                  No segments yet. Create one to use in campaigns.
                </td>
              </tr>
            ) : (
              segments.map((s) => (
                <tr key={s.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{s.name}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{s.description || '—'}</td>
                  <td className="px-6 py-4 text-sm text-right space-x-3">
                    <button
                      type="button"
                      onClick={() => openEdit(s)}
                      className="text-gray-700 hover:text-gray-900 underline"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => remove(s.id)}
                      className="text-red-600 hover:text-red-800 underline"
                    >
                      Delete
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
