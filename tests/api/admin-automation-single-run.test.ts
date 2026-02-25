import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextResponse } from 'next/server'

const mockRunResult = {
  sent: 1,
  skipped: 0,
  failed: 0,
  errors: [] as string[],
  limitReached: false,
}

vi.mock('@/lib/admin', () => ({
  requireAdmin: vi.fn(),
}))

vi.mock('@/lib/run-email-automations', () => ({
  runSingleAutomation: vi.fn().mockResolvedValue(mockRunResult),
}))

import { requireAdmin } from '@/lib/admin'
import { POST } from '@/app/api/admin/emails/automations/[id]/run/route'

describe('POST /api/admin/emails/automations/[id]/run', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when not admin', async () => {
    vi.mocked(requireAdmin).mockResolvedValue(
      NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    )
    const request = new Request('http://localhost/api/admin/emails/automations/abc/run', {
      method: 'POST',
    })
    const res = await POST(request, { params: Promise.resolve({ id: 'abc' }) })
    expect(res.status).toBe(401)
    const data = await res.json()
    expect(data).toHaveProperty('error', 'Unauthorized')
  })

  it('returns 400 when id is missing', async () => {
    vi.mocked(requireAdmin).mockResolvedValue(undefined)
    const request = new Request('http://localhost/api/admin/emails/automations//run', {
      method: 'POST',
    })
    const res = await POST(request, { params: Promise.resolve({ id: '' }) })
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data).toHaveProperty('error', 'ID required')
  })

  it('returns 200 and result shape when admin and id provided', async () => {
    vi.mocked(requireAdmin).mockResolvedValue(undefined)
    const request = new Request('http://localhost/api/admin/emails/automations/abc/run', {
      method: 'POST',
    })
    const res = await POST(request, { params: Promise.resolve({ id: 'abc' }) })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data).toMatchObject({
      sent: expect.any(Number),
      skipped: expect.any(Number),
      failed: expect.any(Number),
      limitReached: expect.any(Boolean),
    })
    expect(Array.isArray(data.errors)).toBe(true)
  })
})
