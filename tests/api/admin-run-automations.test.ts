import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextResponse } from 'next/server'

const mockRunResult = {
  sent: 0,
  skipped: 0,
  failed: 0,
  errors: [] as string[],
  limitReached: false,
}

vi.mock('@/lib/admin', () => ({
  requireAdmin: vi.fn(),
  getAdminSupabase: vi.fn(() => ({
    from: vi.fn(() => ({
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({ data: { id: 'run-id' }, error: null }),
        })),
      })),
      update: vi.fn(() => ({
        eq: vi.fn().mockResolvedValue({ error: null }),
      })),
    })),
  })),
}))

vi.mock('@/lib/run-email-automations', () => ({
  runEmailAutomations: vi.fn().mockResolvedValue(mockRunResult),
}))

import { requireAdmin } from '@/lib/admin'
import { POST } from '@/app/api/admin/emails/run-automations/route'

describe('POST /api/admin/emails/run-automations', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when not admin', async () => {
    vi.mocked(requireAdmin).mockResolvedValue(
      NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    )
    const request = new Request('http://localhost/api/admin/emails/run-automations', {
      method: 'POST',
    })
    const res = await POST(request)
    expect(res.status).toBe(401)
    const data = await res.json()
    expect(data).toHaveProperty('error', 'Unauthorized')
  })

  it('returns 200 and summary shape when admin', async () => {
    vi.mocked(requireAdmin).mockResolvedValue(undefined)
    const request = new Request('http://localhost/api/admin/emails/run-automations', {
      method: 'POST',
    })
    const res = await POST(request)
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
