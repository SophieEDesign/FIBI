'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { getAdminAuthHeaders } from '@/lib/admin-auth-headers'
import {
  PERSON_STATE_LABELS,
  type AdminPersonRow,
  type PersonLifecycleState,
} from '@/lib/admin-metrics'

const STATES: Array<PersonLifecycleState | ''> = [
  '',
  'awaiting_confirmation',
  'confirmed_no_save',
  'activated',
  'dormant',
]

function formatDate(iso: string | null) {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  } catch {
    return '—'
  }
}

function stateChipClass(state: PersonLifecycleState) {
  switch (state) {
    case 'activated':
      return 'bg-[#DFF3E8] text-[#1E6B48]'
    case 'awaiting_confirmation':
      return 'bg-[#FDF3D2] text-[#8C6500]'
    case 'confirmed_no_save':
      return 'bg-[#E4F4FE] text-[#14639B]'
    case 'dormant':
      return 'bg-[#F1EEE6] text-[#5C574C]'
    default:
      return 'bg-[#F1EEE6] text-[#5C574C]'
  }
}

export default function AdminPeopleClient() {
  const [users, setUsers] = useState<AdminPersonRow[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [q, setQ] = useState('')
  const [qDraft, setQDraft] = useState('')
  const [state, setState] = useState<PersonLifecycleState | ''>('')
  const [page, setPage] = useState(0)
  const limit = 50

  const fetchPeople = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const headers = await getAdminAuthHeaders()
      const params = new URLSearchParams()
      params.set('limit', String(limit))
      params.set('offset', String(page * limit))
      if (q.trim()) params.set('q', q.trim())
      if (state) params.set('state', state)
      const res = await fetch(`/api/admin/users?${params}`, { credentials: 'include', headers })
      if (!res.ok) {
        setError(res.status === 403 ? 'Access denied' : "That didn't work. Try again.")
        return
      }
      const data = await res.json()
      setUsers(data.users ?? [])
      setTotal(data.total ?? 0)
    } catch {
      setError("That didn't work. Try again.")
    } finally {
      setLoading(false)
    }
  }, [page, q, state])

  useEffect(() => {
    void fetchPeople()
  }, [fetchPeople])

  const totalPages = Math.max(1, Math.ceil(total / limit))

  return (
    <div className="px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-[#17181A]">People</h1>
          <p className="mt-1 text-sm text-[#5C574C]">Search, filter, and open a person&apos;s story.</p>
        </div>

        <div className="mb-4 flex flex-wrap gap-3">
          <form
            className="flex flex-1 gap-2"
            onSubmit={(e) => {
              e.preventDefault()
              setPage(0)
              setQ(qDraft)
            }}
          >
            <input
              type="search"
              value={qDraft}
              onChange={(e) => setQDraft(e.target.value)}
              placeholder="Search by email"
              className="min-w-[200px] flex-1 rounded-full border border-[#E5E5E5] bg-white px-4 py-2 text-sm focus:border-[#2E9EE8] focus:outline-none focus:ring-2 focus:ring-[#2E9EE8]/30"
            />
            <button
              type="submit"
              className="rounded-full bg-[#2E9EE8] px-4 py-2 text-sm font-medium text-white transition-opacity duration-[130ms] hover:opacity-90"
            >
              Search
            </button>
          </form>
          <select
            value={state}
            onChange={(e) => {
              setPage(0)
              setState(e.target.value as PersonLifecycleState | '')
            }}
            className="rounded-full border border-[#E5E5E5] bg-white px-4 py-2 text-sm"
            aria-label="Filter by state"
          >
            <option value="">All states</option>
            {STATES.filter(Boolean).map((s) => (
              <option key={s} value={s}>
                {PERSON_STATE_LABELS[s as PersonLifecycleState]}
              </option>
            ))}
          </select>
        </div>

        {error && <p className="mb-4 text-sm text-[#9C3226]">{error}</p>}

        <div className="overflow-hidden rounded-[14px] border border-[#E5E5E5] bg-white shadow-[0_1px_2px_rgba(26,26,24,0.06),0_8px_24px_rgba(46,70,120,0.08)]">
          {loading ? (
            <p className="p-6 text-sm text-[#8A857A]">Loading…</p>
          ) : (
            <table className="min-w-full divide-y divide-[#E5E5E5] text-sm">
              <thead className="bg-[#F5F2EC]">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-[#8A857A]">Person</th>
                  <th className="px-4 py-3 text-left font-medium text-[#8A857A]">State</th>
                  <th className="px-4 py-3 text-left font-medium text-[#8A857A]">Signed up</th>
                  <th className="px-4 py-3 text-left font-medium text-[#8A857A]">Places</th>
                  <th className="px-4 py-3 text-left font-medium text-[#8A857A]">Last seen</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E5E5]">
                {users.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-6 text-center text-[#8A857A]">
                      No people match.
                    </td>
                  </tr>
                ) : (
                  users.map((u) => (
                    <tr key={u.id} className="hover:bg-[#FAF8F3]">
                      <td className="px-4 py-3">
                        <Link
                          href={`/app/admin/people/${u.id}`}
                          className="font-medium text-[#17181A] hover:underline"
                        >
                          {u.email || 'No email'}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${stateChipClass(u.state)}`}
                        >
                          {PERSON_STATE_LABELS[u.state]}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[#5C574C]">{formatDate(u.created_at)}</td>
                      <td className="px-4 py-3 text-[#5C574C]">{u.places_count}</td>
                      <td className="px-4 py-3 text-[#5C574C]">
                        {formatDate(u.last_login_at || u.last_activity_at || null)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>

        <div className="mt-4 flex items-center justify-between text-sm text-[#5C574C]">
          <span>
            {total} people · page {page + 1} of {totalPages}
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={page === 0}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              className="rounded-full border border-[#E5E5E5] bg-white px-3 py-1.5 disabled:opacity-40"
            >
              Previous
            </button>
            <button
              type="button"
              disabled={page + 1 >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="rounded-full border border-[#E5E5E5] bg-white px-3 py-1.5 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
