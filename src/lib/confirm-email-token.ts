import { createHmac, timingSafeEqual } from 'crypto'

/**
 * Tokens from this module are used to set profiles.email_verified_at only (app-level
 * "confirmed"). See docs/AUTH_EMAIL_CONFIRMED.md for the dual confirmed concepts
 * (auth.users.email_confirmed_at vs profiles.email_verified_at).
 */
const ALGORITHM = 'sha256'
const TTL_MS = 7 * 24 * 60 * 60 * 1000 // 7 days

function getSecret(): string {
  const secret = process.env.CONFIRM_EMAIL_SECRET
  if (!secret || secret.length < 32) {
    throw new Error('CONFIRM_EMAIL_SECRET must be set and at least 32 characters')
  }
  return secret
}

function base64UrlEncode(buf: Buffer): string {
  return buf.toString('base64url')
}

function base64UrlDecode(str: string): Buffer {
  return Buffer.from(str, 'base64url')
}

/**
 * Create a signed token for email confirmation
 */
export function createConfirmEmailToken(userId: string): string {
  const payload = JSON.stringify({
    userId,
    exp: Date.now() + TTL_MS,
  })
  const payloadB64 = base64UrlEncode(Buffer.from(payload, 'utf8'))
  const signature = createHmac(ALGORITHM, getSecret())
    .update(payloadB64)
    .digest()
  const sigB64 = base64UrlEncode(signature)
  return `${payloadB64}.${sigB64}`
}

/**
 * Verify and decode token; returns userId or null if invalid/expired
 */
export function verifyConfirmEmailToken(token: string): string | null {
  try {
    const [payloadB64, sigB64] = token.split('.')
    if (!payloadB64 || !sigB64) return null

    const expectedSig = createHmac(ALGORITHM, getSecret())
      .update(payloadB64)
      .digest()
    const actualSig = base64UrlDecode(sigB64)
    if (expectedSig.length !== actualSig.length || !timingSafeEqual(expectedSig, actualSig)) {
      return null
    }

    const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'))
    if (typeof payload.userId !== 'string' || typeof payload.exp !== 'number') return null
    if (payload.exp < Date.now()) return null // expired

    return payload.userId
  } catch {
    return null
  }
}
