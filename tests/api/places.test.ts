import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextResponse } from 'next/server'

vi.mock('@/lib/auth', () => ({
  requireUser: vi.fn().mockResolvedValue(NextResponse.json({ error: 'Unauthorized' }, { status: 401 })),
}))

import { POST } from '@/app/api/places/route'

describe('POST /api/places', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when no auth', async () => {
    const request = new Request('http://localhost/api/places', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: 'Paris' }),
    })
    const res = await POST(request)
    expect(res.status).toBe(401)
    const data = await res.json()
    expect(data).toHaveProperty('error', 'Unauthorized')
  })
})
