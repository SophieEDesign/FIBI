import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextResponse } from 'next/server'

vi.mock('@/lib/auth', () => ({
  requireUser: vi.fn().mockResolvedValue(NextResponse.json({ error: 'Unauthorized' }, { status: 401 })),
  allowEnrichAccess: vi.fn().mockResolvedValue({ mode: 'guest', guestKey: 'test-ip' }),
}))

import { POST } from '@/app/api/places/route'
import { allowEnrichAccess } from '@/lib/auth'

describe('POST /api/places', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('allows rate-limited guests without a full account', async () => {
    const request = new Request('http://localhost/api/places', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: 'Paris' }),
    })
    const res = await POST(request as any)
    expect(allowEnrichAccess).toHaveBeenCalled()
    // Without GOOGLE_PLACES_API_KEY in test env, returns empty place
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data).toHaveProperty('place', null)
  })

  it('returns 401 when enrich access is denied', async () => {
    vi.mocked(allowEnrichAccess).mockResolvedValueOnce(
      NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    )
    const request = new Request('http://localhost/api/places', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: 'Paris' }),
    })
    const res = await POST(request as any)
    expect(res.status).toBe(401)
  })
})
