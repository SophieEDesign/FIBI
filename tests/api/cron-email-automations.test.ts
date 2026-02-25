import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockRunResult = {
  sent: 0,
  skipped: 0,
  failed: 0,
  errors: [] as string[],
  limitReached: false,
}

vi.mock('@/lib/run-email-automations', () => ({
  isCronAuthorized: vi.fn(),
  runEmailAutomations: vi.fn().mockResolvedValue(mockRunResult),
}))

vi.mock('@/lib/admin', () => ({
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

import { isCronAuthorized } from '@/lib/run-email-automations'
import { GET } from '@/app/api/cron/email-automations/route'

describe('GET /api/cron/email-automations', () => {
  beforeEach(() => {
    vi.mocked(isCronAuthorized).mockReturnValue(false)
  })

  it('returns 401 when Authorization header is missing', async () => {
    vi.mocked(isCronAuthorized).mockReturnValue(false)
    const request = new Request('http://localhost/api/cron/email-automations', { method: 'GET' })
    const res = await GET(request)
    expect(res.status).toBe(401)
    const data = await res.json()
    expect(data).toHaveProperty('error', 'Unauthorized')
  })

  it('returns 200 and summary shape when cron is authorized', async () => {
    vi.mocked(isCronAuthorized).mockReturnValue(true)
    const request = new Request('http://localhost/api/cron/email-automations', {
      method: 'GET',
      headers: { Authorization: 'Bearer secret-token' },
    })
    const res = await GET(request)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data).toMatchObject({
      sent: expect.any(Number),
      skipped: expect.any(Number),
      failed: expect.any(Number),
      limitReached: expect.any(Boolean),
    })
    expect(data).toHaveProperty('errorCount', 0)
  })
})
