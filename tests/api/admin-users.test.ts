import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextResponse } from 'next/server'

vi.mock('@/lib/admin', () => ({
  requireAdmin: vi.fn().mockResolvedValue(NextResponse.json({ error: 'Unauthorized' }, { status: 401 })),
  getAdminSupabase: vi.fn(),
}))

import { GET } from '@/app/api/admin/users/route'

describe('GET /api/admin/users', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when no auth', async () => {
    const request = new Request('http://localhost/api/admin/users', {
      method: 'GET',
    })
    const res = await GET(request)
    expect(res.status).toBe(401)
    const data = await res.json()
    expect(data).toHaveProperty('error', 'Unauthorized')
  })
})
