'use client'

import { useCallback, useEffect, useState } from 'react'
import { getAdminAuthHeaders } from '@/lib/admin-auth-headers'

interface Attempt {
  id: string
  email: string
  ip_address: string | null
  blocked_reason: string
  created_at: string
}

export default function AdminSignupAttemptsClient() {
  const [attempts, setAttempts] = useState<Attempt[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(0)
  const limit = 50

  const fetchAttempts = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const headers = await getAdminAuthHeaders()
      const params = new URLSearchParams({
        limit: String(limit),
        offset: String(page * limit),
      })
      const res = await fetch(`/api/admin/signup-attempts?${params}`, {
        credentials: 'include',
        headers,
      })
      if (!res.ok) {
        setError(res.status === 403 ? 'Access denied' : "That didn't work. Try again.")
        return
      }
      const data = await res.json()
      setAttempts(data.attempts ?? [])
      setTotal(data.total ?? 0)
    } catch {
      setError("That didn't work. Try again.")
    } finally {
      setLoading(false)
    }
  }, [page])

  useEffect(() => {
    void fetchAttempts()
  }, [fetchAttempts])

  const totalPages = Math.max(1, Math.ceil(total / limit))

  return (
    <div className="px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-[#17181A]">Signup attempts</h1>
          <p className="mt-1 text-sm text-[#5C574C]">
            Blocked signups only — useful when a real person is caught by abuse protection.
          </p>
        </div>

        {error && <p className="mb-4 text-sm text-[#9C3226]">{error}</p>}

        <div className="overflow-hidden rounded-[14px] border border-[#E5E5E5] bg-white shadow-[0_1px_2px_rgba(26,26,24,0.06),0_8px_24px_rgba(46,70,120,0.08)]">
          {loading ? (
            <p className="p-6 text-sm text-[#8A857A]">Loading…</p>
          ) : (
            <table className="min-w-full divide-y divide-[#E5E5E5] text-sm">
              <thead className="bg-[#F5F2EC]">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-[#8A857A]">Email</th>
                  <th className="px-4 py-3 text-left font-medium text-[#8A857A]">Why blocked</th>
                  <th className="px-4 py-3 text-left font-medium text-[#8A857A]">Origin IP</th>
                  <th className="px-4 py-3 text-left font-medium text-[#8A857A]">When</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E5E5]">
                {attempts.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-6 text-center text-[#8A857A]">
                      No blocked attempts.
                    </td>
                  </tr>
                ) : (
                  attempts.map((a) => (
                    <tr key={a.id} className="hover:bg-[#FAF8F3]">
                      <td className="px-4 py-3 font-medium text-[#17181A]">{a.email}</td>
                      <td className="px-4 py-3 text-[#5C574C]">{a.blocked_reason}</td>
                      <td className="px-4 py-3 font-mono text-xs text-[#5C574C]">
                        {a.ip_address || '—'}
                      </td>
                      <td className="px-4 py-3 text-[#5C574C]">
                        {new Date(a.created_at).toLocaleString('en-GB')}
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
            {total} attempts · page {page + 1} of {totalPages}
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
