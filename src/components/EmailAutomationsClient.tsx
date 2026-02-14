'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

const TRIGGER_OPTIONS = [
  { value: 'user_confirmed', label: 'User confirmed' },
  { value: 'user_inactive', label: 'User inactive' },
  { value: 'place_added', label: 'Place added' },
  { value: 'itinerary_created', label: 'Itinerary created' },
  { value: 'manual', label: 'Manual' },
] as const

interface Automation {
  id: string
  name: string
  template_slug: string
  trigger_type: string
  conditions: Record<string, unknown>
  delay_hours: number
  is_active: boolean
}

interface Template {
  id: string
  name: string
  slug: string
}

type ConditionsForm = {
  confirmed?: boolean | null
  places_count_gt?: number | null
  last_login_days_gt?: number | null
  created_days_gt?: number | null
  created_days_lt?: number | null
  itineraries_count_gt?: number | null
}

function conditionsToForm(c: Record<string, unknown> | null | undefined): ConditionsForm {
  if (!c || typeof c !== 'object') return {}
  return {
    confirmed: c.confirmed === true ? true : c.confirmed === false ? false : null,
    places_count_gt: typeof c.places_count_gt === 'number' ? c.places_count_gt : null,
    last_login_days_gt: typeof c.last_login_days_gt === 'number' ? c.last_login_days_gt : null,
    created_days_gt: typeof c.created_days_gt === 'number' ? c.created_days_gt : null,
    created_days_lt: typeof c.created_days_lt === 'number' ? c.created_days_lt : null,
    itineraries_count_gt: typeof c.itineraries_count_gt === 'number' ? c.itineraries_count_gt : null,
  }
}

function formToConditions(f: ConditionsForm): Record<string, unknown> {
  const c: Record<string, unknown> = {}
  if (typeof f.confirmed === 'boolean') c.confirmed = f.confirmed
  if (typeof f.places_count_gt === 'number') c.places_count_gt = f.places_count_gt
  if (typeof f.last_login_days_gt === 'number') c.last_login_days_gt = f.last_login_days_gt
  if (typeof f.created_days_gt === 'number') c.created_days_gt = f.created_days_gt
  if (typeof f.created_days_lt === 'number') c.created_days_lt = f.created_days_lt
  if (typeof f.itineraries_count_gt === 'number') c.itineraries_count_gt = f.itineraries_count_gt
  return c
}

export default function EmailAutomationsClient() {
  const [automations, setAutomations] = useState<Automation[]>([])
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState<Automation | null>(null)
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState({
    name: '',
    template_slug: '',
    trigger_type: 'user_confirmed',
    conditions: {} as ConditionsForm,
    delay_hours: 0,
    is_active: false,
  })
  const [saving, setSaving] = useState(false)
  const [runningId, setRunningId] = useState<string | null>(null)
  const [runResult, setRunResult] = useState<{ sent: number; skipped: number; failed: number; errors?: string[] } | null>(null)
  const [formError, setFormError] = useState<string | null>(null)

  const getAuthHeaders = useCallback(async (): Promise<Record<string, string>> => {
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (session?.access_token) {
      return { Authorization: `Bearer ${session.access_token}` }
    }
    return {}
  }, [])

  const fetchAutomations = useCallback(async () => {
    try {
      const headers = await getAuthHeaders()
      const res = await fetch('/api/admin/emails/automations', { credentials: 'include', headers })
      if (!res.ok) {
        setError(res.status === 403 ? 'Access denied' : 'Failed to load automations')
        return
      }
      const data = await res.json()
      setAutomations(data.automations ?? [])
    } catch {
      setError('Failed to load automations')
    }
  }, [getAuthHeaders])

  const fetchTemplates = useCallback(async () => {
    try {
      const headers = await getAuthHeaders()
      const res = await fetch('/api/admin/emails/templates', { credentials: 'include', headers })
      if (!res.ok) return
      const data = await res.json()
      setTemplates(data.templates ?? [])
    } catch {
      // ignore
    }
  }, [getAuthHeaders])

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      await Promise.all([fetchAutomations(), fetchTemplates()])
      if (!cancelled) setLoading(false)
    }
    run()
    return () => { cancelled = true }
  }, [fetchAutomations, fetchTemplates])

  const handleCreate = () => {
    setCreating(true)
    setEditing(null)
    setForm({
      name: '',
      template_slug: templates[0]?.slug ?? '',
      trigger_type: 'user_confirmed',
      conditions: {},
      delay_hours: 0,
      is_active: false,
    })
    setFormError(null)
    setRunResult(null)
  }

  const handleEdit = (a: Automation) => {
    setEditing(a)
    setCreating(false)
    setForm({
      name: a.name,
      template_slug: a.template_slug,
      trigger_type: a.trigger_type,
      conditions: conditionsToForm(a.conditions as Record<string, unknown>),
      delay_hours: a.delay_hours,
      is_active: a.is_active,
    })
    setFormError(null)
    setRunResult(null)
  }

  const handleCancel = () => {
    setCreating(false)
    setEditing(null)
    setRunResult(null)
  }

  const handleSave = async () => {
    setFormError(null)
    if (!form.name.trim() || !form.template_slug || !form.trigger_type) {
      setFormError('Name, template, and trigger are required')
      return
    }
    setSaving(true)
    try {
      const headers = await getAuthHeaders()
      const url = editing
        ? `/api/admin/emails/automations/${editing.id}`
        : '/api/admin/emails/automations'
      const method = editing ? 'PATCH' : 'POST'
      const body = {
        name: form.name.trim(),
        template_slug: form.template_slug,
        trigger_type: form.trigger_type,
        conditions: formToConditions(form.conditions),
        delay_hours: form.delay_hours,
        is_active: form.is_active,
      }
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
      await fetchAutomations()
      setCreating(false)
      setEditing(null)
    } catch {
      setFormError('Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const handleRun = async (id: string) => {
    setRunResult(null)
    setRunningId(id)
    try {
      const headers = await getAuthHeaders()
      const res = await fetch(`/api/admin/emails/automations/${id}/run`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', ...headers },
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setRunResult({ sent: 0, skipped: 0, failed: 0, errors: [data.error ?? 'Failed to run'] })
        return
      }
      setRunResult({
        sent: data.sent ?? 0,
        skipped: data.skipped ?? 0,
        failed: data.failed ?? 0,
        errors: data.errors,
      })
    } catch {
      setRunResult({ sent: 0, skipped: 0, failed: 0, errors: ['Request failed'] })
    } finally {
      setRunningId(null)
    }
  }

  const updateCondition = (key: keyof ConditionsForm, value: number | boolean | null) => {
    setForm((f) => ({
      ...f,
      conditions: { ...f.conditions, [key]: value ?? undefined },
    }))
  }

  if (loading) {
    return <div className="text-gray-500">Loading automations…</div>
  }

  if (error) {
    return <div className="text-red-500">{error}</div>
  }

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Email Automations</h1>

      {/* List */}
      <div className="bg-white rounded-lg shadow overflow-hidden mb-8">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Automations</h2>
          <button
            type="button"
            onClick={handleCreate}
            disabled={creating || !!editing}
            className="px-4 py-2 text-sm font-medium text-white bg-gray-800 hover:bg-gray-700 rounded disabled:opacity-50"
          >
            Create new
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Template</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Trigger</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Delay (h)</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Active</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {automations.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                    No automations yet. Create one to get started.
                  </td>
                </tr>
              ) : (
                automations.map((a) => (
                  <tr key={a.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{a.name}</td>
                    <td className="px-6 py-4 text-sm text-gray-500 font-mono">{a.template_slug}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{a.trigger_type}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{a.delay_hours}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{a.is_active ? 'Yes' : 'No'}</td>
                    <td className="px-6 py-4 flex gap-2">
                      <button
                        type="button"
                        onClick={() => handleEdit(a)}
                        className="text-sm text-gray-600 hover:text-gray-900"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRun(a.id)}
                        disabled={runningId !== null || !a.is_active}
                        className="text-sm text-gray-600 hover:text-gray-900 disabled:opacity-50"
                      >
                        {runningId === a.id ? 'Running…' : 'Run now'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create / Edit form */}
      {(creating || editing) && (
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            {editing ? `Edit: ${editing.name}` : 'Create automation'}
          </h2>
          {formError && (
            <p className="mb-4 text-sm text-red-600" role="alert">{formError}</p>
          )}
          {runResult && (
            <div className="mb-4 p-4 rounded border bg-gray-50 text-sm text-gray-800">
              Sent: {runResult.sent}, Skipped: {runResult.skipped}, Failed: {runResult.failed}
              {runResult.errors && runResult.errors.length > 0 && (
                <ul className="mt-2 text-red-700 list-disc list-inside">
                  {runResult.errors.slice(0, 5).map((e, i) => (
                    <li key={i}>{e}</li>
                  ))}
                </ul>
              )}
            </div>
          )}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
                placeholder="e.g. Welcome after confirm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Template</label>
              <select
                value={form.template_slug}
                onChange={(e) => setForm((f) => ({ ...f, template_slug: e.target.value }))}
                className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
              >
                <option value="">Select template</option>
                {templates.map((t) => (
                  <option key={t.id} value={t.slug}>
                    {t.name} ({t.slug})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Trigger</label>
              <select
                value={form.trigger_type}
                onChange={(e) => setForm((f) => ({ ...f, trigger_type: e.target.value }))}
                className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
              >
                {TRIGGER_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Delay (hours)</label>
              <input
                type="number"
                min={0}
                value={form.delay_hours}
                onChange={(e) => setForm((f) => ({ ...f, delay_hours: parseInt(e.target.value, 10) || 0 }))}
                className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
              />
            </div>

            {/* Condition builder */}
            <div className="border-t pt-4">
              <h3 className="text-sm font-medium text-gray-700 mb-2">Conditions (optional)</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Confirmed</label>
                  <select
                    value={form.conditions.confirmed === true ? 'true' : form.conditions.confirmed === false ? 'false' : ''}
                    onChange={(e) => {
                      const v = e.target.value
                      updateCondition('confirmed', v === 'true' ? true : v === 'false' ? false : null)
                    }}
                    className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
                  >
                    <option value="">Any</option>
                    <option value="true">Yes</option>
                    <option value="false">No</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">places_count &gt;</label>
                  <input
                    type="number"
                    min={0}
                    value={form.conditions.places_count_gt ?? ''}
                    onChange={(e) => updateCondition('places_count_gt', e.target.value === '' ? null : parseInt(e.target.value, 10))}
                    placeholder="—"
                    className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">last_login_days &gt;</label>
                  <input
                    type="number"
                    min={0}
                    value={form.conditions.last_login_days_gt ?? ''}
                    onChange={(e) => updateCondition('last_login_days_gt', e.target.value === '' ? null : parseInt(e.target.value, 10))}
                    placeholder="—"
                    className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">created_days &gt;</label>
                  <input
                    type="number"
                    min={0}
                    value={form.conditions.created_days_gt ?? ''}
                    onChange={(e) => updateCondition('created_days_gt', e.target.value === '' ? null : parseInt(e.target.value, 10))}
                    placeholder="—"
                    className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">created_days &lt;</label>
                  <input
                    type="number"
                    min={0}
                    value={form.conditions.created_days_lt ?? ''}
                    onChange={(e) => updateCondition('created_days_lt', e.target.value === '' ? null : parseInt(e.target.value, 10))}
                    placeholder="—"
                    className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">itineraries_count &gt;</label>
                  <input
                    type="number"
                    min={0}
                    value={form.conditions.itineraries_count_gt ?? ''}
                    onChange={(e) => updateCondition('itineraries_count_gt', e.target.value === '' ? null : parseInt(e.target.value, 10))}
                    placeholder="—"
                    className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
                  />
                </div>
              </div>
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

          <div className="mt-6 flex gap-3">
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
              <button
                type="button"
                onClick={() => handleRun(editing.id)}
                disabled={runningId !== null || !editing.is_active}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50"
              >
                {runningId === editing.id ? 'Running…' : 'Run now'}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
