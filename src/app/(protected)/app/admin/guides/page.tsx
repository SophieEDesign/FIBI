'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/useAuth'
import { createClient } from '@/lib/supabase/client'
import type { TravelGuide } from '@/types/database'

export default function AdminGuidesPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const [adminChecked, setAdminChecked] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [guides, setGuides] = useState<TravelGuide[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)

  const getAuthHeaders = useCallback(async (): Promise<Record<string, string>> => {
    const supabase = createClient()
    const { data: { user: u } } = await supabase.auth.getUser()
    if (!u) return {}
    const { data: { session } } = await supabase.auth.getSession()
    if (session?.access_token) {
      return { Authorization: `Bearer ${session.access_token}` }
    }
    return {}
  }, [])

  useEffect(() => {
    if (authLoading || !user?.id) {
      if (!authLoading && !user) {
        router.replace('/login?redirect=/app/admin/guides')
      }
      return
    }
    let cancelled = false
    const client = createClient()
    Promise.resolve(
      client
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()
    )
      .then(({ data, error: roleError }) => {
        if (cancelled) return
        setAdminChecked(true)
        setIsAdmin(!roleError && data?.role === 'admin')
      })
      .catch(() => {
        if (!cancelled) {
          setAdminChecked(true)
          setIsAdmin(false)
        }
      })
    return () => {
      cancelled = true
    }
  }, [authLoading, user, router])

  useEffect(() => {
    if (!adminChecked || isAdmin) return
    router.replace('/app')
  }, [adminChecked, isAdmin, router])

  useEffect(() => {
    if (!isAdmin) return
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setError(null)
      try {
        const headers = await getAuthHeaders()
        const res = await fetch('/api/admin/guides', { credentials: 'include', headers })
        if (!res.ok) throw new Error('Failed to load guides')
        const data = await res.json()
        if (!cancelled) setGuides(data.guides || [])
      } catch {
        if (!cancelled) setError("That didn't work. Try again.")
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [isAdmin, getAuthHeaders])

  const createGuide = async () => {
    setCreating(true)
    setError(null)
    try {
      const headers = await getAuthHeaders()
      const res = await fetch('/api/admin/guides', {
        method: 'POST',
        credentials: 'include',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Untitled guide' }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to create')
      router.push(`/app/admin/guides/${data.guide.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : "That didn't work. Try again.")
      setCreating(false)
    }
  }

  if (authLoading || !adminChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-500">
        Loading…
      </div>
    )
  }

  if (!isAdmin) return null

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Travel Guides</h1>
            <p className="mt-2 text-sm text-gray-600">
              Public editorial guides — separate from user Travel Boards.
            </p>
          </div>
          <div className="flex flex-wrap gap-4 items-center">
            <Link href="/app/admin" className="text-sm text-gray-600 hover:text-gray-900">
              Users
            </Link>
            <Link href="/app/admin/guides" className="text-sm font-medium text-gray-900">
              Guides
            </Link>
            <button
              type="button"
              onClick={createGuide}
              disabled={creating}
              className="px-4 py-2 text-sm font-medium bg-gray-900 text-white hover:bg-gray-800 disabled:opacity-60"
            >
              {creating ? 'Creating…' : 'New guide'}
            </button>
          </div>
        </div>

        {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

        {loading ? (
          <p className="text-gray-500">Loading…</p>
        ) : guides.length === 0 ? (
          <p className="text-gray-600">No guides yet. Create one to get started.</p>
        ) : (
          <div className="bg-white shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Title</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Status</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Destination</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Published</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Updated</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {guides.map((g) => (
                  <tr key={g.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <Link
                        href={`/app/admin/guides/${g.id}`}
                        className="font-medium text-gray-900 hover:underline"
                      >
                        {g.title}
                      </Link>
                      {g.featured && (
                        <span className="ml-2 text-xs text-amber-700">Featured</span>
                      )}
                    </td>
                    <td className="px-4 py-3 capitalize text-gray-600">{g.status}</td>
                    <td className="px-4 py-3 text-gray-600">
                      {[g.destination_name, g.country].filter(Boolean).join(', ') || '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {g.published_at
                        ? new Date(g.published_at).toLocaleDateString('en-GB')
                        : '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {g.updated_at
                        ? new Date(g.updated_at).toLocaleDateString('en-GB')
                        : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
