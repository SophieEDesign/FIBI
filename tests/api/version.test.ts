import { describe, it, expect } from 'vitest'
import { GET } from '@/app/api/version/route'

describe('GET /api/version', () => {
  it('returns 200 and version object', async () => {
    const res = await GET()
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data).toHaveProperty('version')
    expect(typeof data.version).toBe('string')
  })
})
