import { createHmac, timingSafeEqual } from 'crypto'

/**
 * Signed unsubscribe tokens for marketing emails (one-click + preference links).
 * Uses EMAIL_UNSUB_SECRET if set, otherwise CONFIRM_EMAIL_SECRET.
 */
const ALGORITHM = 'sha256'
const TTL_MS = 2 * 365 * 24 * 60 * 60 * 1000 // 2 years

function getSecret(): string {
  const secret = process.env.EMAIL_UNSUB_SECRET || process.env.CONFIRM_EMAIL_SECRET
  if (!secret || secret.length < 32) {
    throw new Error('EMAIL_UNSUB_SECRET or CONFIRM_EMAIL_SECRET must be set (32+ characters)')
  }
  return secret
}

function base64UrlEncode(buf: Buffer): string {
  return buf.toString('base64url')
}

function base64UrlDecode(str: string): Buffer {
  return Buffer.from(str, 'base64url')
}

export function createUnsubscribeToken(userId: string): string {
  const payload = JSON.stringify({
    purpose: 'unsub',
    userId,
    exp: Date.now() + TTL_MS,
  })
  const payloadB64 = base64UrlEncode(Buffer.from(payload, 'utf8'))
  const signature = createHmac(ALGORITHM, getSecret()).update(payloadB64).digest()
  return `${payloadB64}.${base64UrlEncode(signature)}`
}

export function verifyUnsubscribeToken(token: string): string | null {
  try {
    const [payloadB64, sigB64] = token.split('.')
    if (!payloadB64 || !sigB64) return null

    const expectedSig = createHmac(ALGORITHM, getSecret()).update(payloadB64).digest()
    const actualSig = base64UrlDecode(sigB64)
    if (expectedSig.length !== actualSig.length || !timingSafeEqual(expectedSig, actualSig)) {
      return null
    }

    const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8')) as {
      purpose?: string
      userId?: string
      exp?: number
    }
    if (payload.purpose !== 'unsub' || typeof payload.userId !== 'string') return null
    if (typeof payload.exp !== 'number' || payload.exp < Date.now()) return null
    return payload.userId
  } catch {
    return null
  }
}

export function getSiteBaseUrl(): string {
  const site = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '')
  if (site) return site
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL.replace(/\/$/, '')}`
  return 'https://fibi.world'
}

/** Browser + one-click unsubscribe URL for a user. */
export function buildUnsubscribeUrl(userId: string): string {
  const token = createUnsubscribeToken(userId)
  return `${getSiteBaseUrl()}/unsubscribe?token=${encodeURIComponent(token)}`
}

/** API endpoint used in List-Unsubscribe header (RFC 8058 one-click POST). */
export function buildUnsubscribeApiUrl(userId: string): string {
  const token = createUnsubscribeToken(userId)
  return `${getSiteBaseUrl()}/api/unsubscribe?token=${encodeURIComponent(token)}`
}
