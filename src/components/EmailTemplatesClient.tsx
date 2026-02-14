'use client'

import { useEffect, useState, useCallback } from 'react'
import DOMPurify from 'dompurify'
import { createClient } from '@/lib/supabase/client'

interface Template {
  id: string
  name: string
  slug: string
  subject: string
  html_content?: string
  is_active: boolean
  created_at?: string
  updated_at?: string
}

export default function EmailTemplatesClient() {
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState<Template | null>(null)
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState({ name: '', slug: '', subject: '', html_content: '', is_active: false })
  const [testEmail, setTestEmail] = useState('')
  const [saving, setSaving] = useState(false)
  const [sendingTest, setSendingTest] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const getAuthHeaders = useCallback(async (): Promise<Record<string, string>> => {
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (session?.access_token) {
      return { Authorization: `Bearer ${session.access_token}` }
    }
    return {}
  }, [])

  const fetchTemplates = useCallback(async () => {
    try {
      const headers = await getAuthHeaders()
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
  }, [getAuthHeaders])

  useEffect(() => {
    fetchTemplates()
  }, [fetchTemplates])

  const slugify = (s: string) =>
    s.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-_]/g, '')

  const handleCreate = () => {
    setCreating(true)
    setEditing(null)
    setForm({ name: '', slug: '', subject: '', html_content: '', is_active: false })
    setFormError(null)
  }

  const handleEdit = async (t: Template) => {
    setEditing(t)
    setCreating(false)
    setFormError(null)
    setForm({
      name: t.name,
      slug: t.slug,
      subject: t.subject,
      html_content: t.html_content ?? '',
      is_active: t.is_active,
    })
    if (t.html_content === undefined) {
      try {
        const headers = await getAuthHeaders()
        const res = await fetch(`/api/admin/emails/templates/${encodeURIComponent(t.slug)}`, {
          credentials: 'include',
          headers,
        })
        if (res.ok) {
          const full = await res.json()
          setForm((f) => ({ ...f, html_content: full.html_content ?? '' }))
        }
      } catch {
        // Keep form as is
      }
    }
  }

  const handleCancel = () => {
    setCreating(false)
    setEditing(null)
  }

  const handleSave = async () => {
    setFormError(null)
    if (!form.name.trim() || !form.slug.trim() || !form.subject.trim()) {
      setFormError('Name, slug, and subject are required')
      return
    }
    setSaving(true)
    try {
      const headers = await getAuthHeaders()
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
      const headers = await getAuthHeaders()
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

  const sanitizedPreview = DOMPurify.sanitize(form.html_content || '', {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'a', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'div', 'span', 'img'],
    ALLOWED_ATTR: ['href', 'target', 'rel', 'src', 'alt'],
  })

  if (loading) {
    return <div className="text-gray-500">Loading templates…</div>
  }

  if (error) {
    return <div className="text-red-500">{error}</div>
  }

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Email Templates</h1>

      {/* List */}
      <div className="bg-white rounded-lg shadow overflow-hidden mb-8">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Templates</h2>
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
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Slug</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Subject</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Active</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {templates.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                    No templates yet. Create one to get started.
                  </td>
                </tr>
              ) : (
                templates.map((t) => (
                  <tr key={t.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{t.name}</td>
                    <td className="px-6 py-4 text-sm text-gray-500 font-mono">{t.slug}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{t.subject}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{t.is_active ? 'Yes' : 'No'}</td>
                    <td className="px-6 py-4">
                      <button
                        type="button"
                        onClick={() => handleEdit(t)}
                        className="text-sm text-gray-600 hover:text-gray-900"
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

      {/* Create / Edit form */}
      {(creating || editing) && (
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            {editing ? `Edit: ${editing.name}` : 'Create template'}
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
                onChange={(e) => {
                  setForm((f) => ({ ...f, name: e.target.value }))
                  if (!editing) setForm((f) => ({ ...f, slug: slugify(e.target.value) }))
                }}
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
              <label className="block text-sm font-medium text-gray-700 mb-1">HTML content</label>
              <textarea
                value={form.html_content}
                onChange={(e) => setForm((f) => ({ ...f, html_content: e.target.value }))}
                rows={12}
                className="w-full rounded border border-gray-300 px-3 py-2 text-sm font-mono"
                placeholder="<h1>Hello</h1><p>Your HTML here...</p>"
                spellCheck={false}
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

          {/* Live preview */}
          <div className="mt-8">
            <h3 className="text-sm font-medium text-gray-700 mb-2">Live preview</h3>
            <div
              className="rounded border border-gray-200 p-4 bg-white min-h-[120px] text-sm prose prose-sm max-w-none"
              dangerouslySetInnerHTML={{ __html: sanitizedPreview || '<p class="text-gray-400">Preview will appear here</p>' }}
            />
          </div>
        </div>
      )}
    </div>
  )
}
