'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { getAdminAuthHeaders } from '@/lib/admin-auth-headers'
import type { TravelGuide } from '@/types/database'

type GuideRow = TravelGuide & { views_30d?: number; saves_30d?: number }

export default function AdminGuidesPage() {
  const router = useRouter()
  const [guides, setGuides] = useState<GuideRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)

  const loadGuides = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const headers = await getAdminAuthHeaders()
      const res = await fetch('/api/admin/guides', { credentials: 'include', headers })
      if (!res.ok) throw new Error('Failed to load guides')
      const data = await res.json()
      setGuides(data.guides || [])
    } catch {
      setError("That didn't work. Try again.")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadGuides()
  }, [loadGuides])

  const createGuide = async () => {
    setCreating(true)
    setError(null)
    try {
      const headers = await getAdminAuthHeaders()
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

  return (
    <div className="px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-[#17181A]">Travel guides</h1>
            <p className="mt-1 text-sm text-[#5C574C]">
              Public editorial guides — separate from user Travel Boards.
            </p>
          </div>
          <button
            type="button"
            onClick={createGuide}
            disabled={creating}
            className="rounded-full bg-[#2E9EE8] px-4 py-2 text-sm font-medium text-white transition-opacity duration-[130ms] hover:opacity-90 disabled:opacity-60"
          >
            {creating ? 'Creating…' : 'New guide'}
          </button>
        </div>

        {error && <p className="mb-4 text-sm text-[#9C3226]">{error}</p>}

        {loading ? (
          <p className="text-[#8A857A]">Loading…</p>
        ) : guides.length === 0 ? (
          <p className="text-[#5C574C]">No guides yet. Create one to get started.</p>
        ) : (
          <div className="overflow-hidden rounded-[14px] border border-[#E5E5E5] bg-white shadow-[0_1px_2px_rgba(26,26,24,0.06),0_8px_24px_rgba(46,70,120,0.08)]">
            <table className="min-w-full divide-y divide-[#E5E5E5] text-sm">
              <thead className="bg-[#F5F2EC]">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-[#8A857A]">Title</th>
                  <th className="px-4 py-3 text-left font-medium text-[#8A857A]">Status</th>
                  <th className="px-4 py-3 text-left font-medium text-[#8A857A]">Views 30d</th>
                  <th className="px-4 py-3 text-left font-medium text-[#8A857A]">Saves 30d</th>
                  <th className="px-4 py-3 text-left font-medium text-[#8A857A]">Destination</th>
                  <th className="px-4 py-3 text-left font-medium text-[#8A857A]">Updated</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E5E5]">
                {guides.map((g) => (
                  <tr key={g.id} className="hover:bg-[#FAF8F3]">
                    <td className="px-4 py-3">
                      <Link
                        href={`/app/admin/guides/${g.id}`}
                        className="font-medium text-[#17181A] hover:underline"
                      >
                        {g.title}
                      </Link>
                      {g.featured && (
                        <span className="ml-2 text-xs text-[#8C6500]">Featured</span>
                      )}
                    </td>
                    <td className="px-4 py-3 capitalize text-[#5C574C]">{g.status}</td>
                    <td className="px-4 py-3 text-[#5C574C]">{g.views_30d ?? 0}</td>
                    <td className="px-4 py-3 text-[#5C574C]">{g.saves_30d ?? 0}</td>
                    <td className="px-4 py-3 text-[#5C574C]">
                      {[g.destination_name, g.country].filter(Boolean).join(', ') || '—'}
                    </td>
                    <td className="px-4 py-3 text-[#8A857A]">
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
