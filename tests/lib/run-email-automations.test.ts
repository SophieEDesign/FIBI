import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { isCronAuthorized } from '@/lib/run-email-automations'

describe('isCronAuthorized', () => {
  const originalCronKey = process.env.CRON_KEY
  const originalCronSecret = process.env.CRON_SECRET

  afterEach(() => {
    process.env.CRON_KEY = originalCronKey
    process.env.CRON_SECRET = originalCronSecret
  })

  it('returns false when no env token set', async () => {
    delete process.env.CRON_KEY
    delete process.env.CRON_SECRET
    const request = new Request('http://localhost/api/cron/email-automations', {
      headers: { Authorization: 'Bearer any-token' },
    })
    expect(isCronAuthorized(request)).toBe(false)
  })

  it('returns false when token is shorter than 16 chars', async () => {
    process.env.CRON_SECRET = 'short'
    const request = new Request('http://localhost/api/cron/email-automations', {
      headers: { Authorization: 'Bearer short' },
    })
    expect(isCronAuthorized(request)).toBe(false)
  })

  it('returns false when Authorization header is missing', async () => {
    process.env.CRON_SECRET = 'a-long-secret-at-least-16-chars'
    const request = new Request('http://localhost/api/cron/email-automations', {
      headers: {},
    })
    expect(isCronAuthorized(request)).toBe(false)
  })

  it('returns false when Authorization is not Bearer', async () => {
    process.env.CRON_SECRET = 'a-long-secret-at-least-16-chars'
    const request = new Request('http://localhost/api/cron/email-automations', {
      headers: { Authorization: 'Basic xyz' },
    })
    expect(isCronAuthorized(request)).toBe(false)
  })

  it('returns true when CRON_SECRET set and Bearer matches', async () => {
    process.env.CRON_KEY = undefined
    process.env.CRON_SECRET = 'a-long-secret-at-least-16-chars'
    const request = new Request('http://localhost/api/cron/email-automations', {
      headers: { Authorization: 'Bearer a-long-secret-at-least-16-chars' },
    })
    expect(isCronAuthorized(request)).toBe(true)
  })

  it('returns true when CRON_KEY set and Bearer matches', async () => {
    process.env.CRON_KEY = 'a-long-cron-key-16-chars'
    process.env.CRON_SECRET = undefined
    const request = new Request('http://localhost/api/cron/email-automations', {
      headers: { Authorization: 'Bearer a-long-cron-key-16-chars' },
    })
    expect(isCronAuthorized(request)).toBe(true)
  })
})
