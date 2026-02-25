import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextResponse } from 'next/server'

const mockLastRun = {
  started_at: '2025-01-01T08:00:00Z',
  finished_at: '2025-01-01T08:01:00Z',
  sent: 2,
  skipped: 10,
  failed: 0,
  status: 'success',
  errors: [],
}

vi.mock('@/lib/admin', () => ({
  requireAdmin: vi.fn(),
  getAdminSupabase: vi.fn(),
}))

import { requireAdmin, getAdminSupabase } from '@/lib/admin'
import { GET } from '@/app/api/admin/emails/automation-status/route'

describe('GET /api/admin/emails/automation-status', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getAdminSupabase).mockReturnValue({
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          order: vi.fn(() => ({
            limit: vi.fn(() => ({
              maybeSingle: vi.fn().mockResolvedValue({ data: mockLastRun, error: null }),
            })),
          })),
        })),
      })),
    } as unknown as ReturnType<typeof getAdminSupabase>)
  })

  it('returns 401 when not admin', async () => {
    vi.mocked(requireAdmin).mockResolvedValue(
      NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    )
    const request = new Request('http://localhost/api/admin/emails/automation-status', {
      method: 'GET',
    })
    const res = await GET(request)
    expect(res.status).toBe(401)
    const data = await res.json()
    expect(data).toHaveProperty('error', 'Unauthorized')
  })

  it('returns 200 and lastRun shape when admin', async () => {
    vi.mocked(requireAdmin).mockResolvedValue(undefined)
    const request = new Request('http://localhost/api/admin/emails/automation-status', {
      method: 'GET',
    })
    const res = await GET(request)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data).toHaveProperty('lastRun')
    expect(data.lastRun).toMatchObject({
      started_at: mockLastRun.started_at,
      finished_at: mockLastRun.finished_at,
      sent: mockLastRun.sent,
      skipped: mockLastRun.skipped,
      failed: mockLastRun.failed,
      status: mockLastRun.status,
    })
    expect(Array.isArray(data.lastRun.errors)).toBe(true)
  })

  it('returns lastRun null when no runs', async () => {
    vi.mocked(requireAdmin).mockResolvedValue(undefined)
    vi.mocked(getAdminSupabase).mockReturnValue({
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          order: vi.fn(() => ({
            limit: vi.fn(() => ({
              maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
            })),
          })),
        })),
      })),
    } as unknown as ReturnType<typeof getAdminSupabase>)
    const request = new Request('http://localhost/api/admin/emails/automation-status', {
      method: 'GET',
    })
    const res = await GET(request)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data).toEqual({ lastRun: null })
  })
})
