/**
 * Signup protection: email validation, rate limiting, CAPTCHA verification.
 * All validation is intended to run server-side before calling supabase.auth.signUp() or admin.createUser().
 */

import { getAdminSupabase } from '@/lib/admin'

// --- Constants ---

const SIGNUP_RATE_LIMIT_PER_HOUR = 5
const SIGNUP_RATE_LIMIT_PER_MINUTE = 2

/** Disposable / temporary email domains (lowercase). */
const DISPOSABLE_DOMAINS = new Set([
  'mailinator.com',
  'mailinator.net',
  'mailinator2.com',
  'temp-mail.org',
  'tempmail.com',
  'tempmail.net',
  'guerrillamail.com',
  'guerrillamail.net',
  '10minutemail.com',
  '10minutemail.net',
  'throwaway.email',
  'fakeinbox.com',
  'trashmail.com',
  'yopmail.com',
  'getnada.com',
  'maildrop.cc',
  'sharklasers.com',
  'guerrillamailblock.com',
  'spam4.me',
  'tempinbox.com',
  'dispostable.com',
  'mohmal.com',
  'emailondeck.com',
  'mintemail.com',
  'tmpeml.com',
  'tempail.com',
  'inboxkitten.com',
  'mailnesia.com',
  'mail-temp.com',
  'temp-mail.io',
  'temp-mail.ru',
  'minuteinbox.com',
  'mytemp.email',
  'fakeinbox.info',
  'disposable.com',
  'mailinator.xyz',
  'tempmailo.com',
])

/** SMS / gateway domains that are not real inboxes (lowercase). */
const SMS_GATEWAY_DOMAINS = new Set([
  'txt.att.net',
  'vtext.com',
  'tmomail.net',
  'messaging.sprintpcs.com',
  'vmobl.com',
  'mmst5.tracfone.com',
  'mymetropcs.com',
  'myboostmobile.com',
  'vzwpix.com',
  'sms.myboostmobile.com',
  'mms.att.net',
  'pm.sprint.com',
  'email.uscc.net',
  'mms.uscc.net',
])

/** Max number of dot-separated segments in the local part (e.g. a.l.e.x@x.com has 5). */
const MAX_LOCAL_PART_SEGMENTS = 4
/** Max single-char segments (dot-sprayed Gmail pattern e.g. a.l.e.x.a.n.d.e.r@gmail.com). */
const MAX_SINGLE_CHAR_SEGMENTS = 2

// --- Email validation ---

export type EmailValidationResult =
  | { valid: true }
  | { valid: false; reason: string }

/**
 * Validates email for signup: rejects disposable domains, SMS gateways, and excessive dot patterns.
 * Does not validate format (assume that is done by the client or a generic validator).
 */
export function validateEmailPattern(email: string): EmailValidationResult {
  const normalized = email.trim().toLowerCase()
  if (!normalized) {
    return { valid: false, reason: 'Invalid email.' }
  }

  const atIndex = normalized.indexOf('@')
  if (atIndex <= 0 || atIndex === normalized.length - 1) {
    return { valid: false, reason: 'Invalid email.' }
  }

  const localPart = normalized.slice(0, atIndex)
  const domain = normalized.slice(atIndex + 1)

  // Reject excessive dot-separated local part (e.g. a.l.e.x.l.i.b.e.r.a.l...)
  const localSegments = localPart.split('.').filter(Boolean)
  if (localSegments.length > MAX_LOCAL_PART_SEGMENTS) {
    return { valid: false, reason: 'This email format is not allowed.' }
  }

  // Reject dot-sprayed / obviously automated Gmail-style patterns (many single-char segments)
  const singleCharSegments = localSegments.filter((s) => s.length === 1).length
  if (singleCharSegments > MAX_SINGLE_CHAR_SEGMENTS) {
    return { valid: false, reason: 'This email format is not allowed.' }
  }

  // Reject known disposable domains
  if (DISPOSABLE_DOMAINS.has(domain)) {
    return { valid: false, reason: 'Please use a permanent email address.' }
  }

  // Reject SMS gateway domains
  if (SMS_GATEWAY_DOMAINS.has(domain)) {
    return { valid: false, reason: 'SMS gateway addresses are not allowed. Please use a regular email.' }
  }

  return { valid: true }
}

// --- Rate limiting ---

export type RateLimitResult =
  | { allowed: true }
  | { allowed: false; reason: string; reasonCode?: 'rate_limit_minute' | 'rate_limit_hour' }

/**
 * Checks whether the IP has exceeded signup attempts (2 per minute, 5 per hour).
 * Uses signup_rate_limits table (service role). Does not record the attempt; caller should record after success.
 */
export async function validateRateLimit(ipAddress: string | null): Promise<RateLimitResult> {
  if (!ipAddress?.trim()) {
    return { allowed: true }
  }

  const supabase = getAdminSupabase()
  const ip = ipAddress.trim()

  const sinceMinute = new Date(Date.now() - 60 * 1000).toISOString()
  const sinceHour = new Date(Date.now() - 60 * 60 * 1000).toISOString()

  const { count: countMinute, error: errMinute } = await supabase
    .from('signup_rate_limits')
    .select('*', { count: 'exact', head: true })
    .eq('ip_address', ip)
    .gte('created_at', sinceMinute)

  if (errMinute) {
    console.error('Signup rate limit (minute) check failed:', errMinute)
  } else if ((countMinute ?? 0) >= SIGNUP_RATE_LIMIT_PER_MINUTE) {
    return {
      allowed: false,
      reason: 'Too many attempts. Please wait a minute before trying again.',
      reasonCode: 'rate_limit_minute',
    }
  }

  const { count: countHour, error: errHour } = await supabase
    .from('signup_rate_limits')
    .select('*', { count: 'exact', head: true })
    .eq('ip_address', ip)
    .gte('created_at', sinceHour)

  if (errHour) {
    console.error('Signup rate limit (hour) check failed:', errHour)
    return { allowed: true }
  }

  if ((countHour ?? 0) >= SIGNUP_RATE_LIMIT_PER_HOUR) {
    return {
      allowed: false,
      reason: 'Too many signup attempts. Please try again in an hour.',
      reasonCode: 'rate_limit_hour',
    }
  }

  return { allowed: true }
}

/**
 * Records one signup attempt for the given IP (call after validation, before createUser).
 * Used for rate limit counting.
 */
export async function recordSignupAttempt(ipAddress: string | null): Promise<void> {
  if (!ipAddress?.trim()) return

  const supabase = getAdminSupabase()
  await supabase.from('signup_rate_limits').insert({
    ip_address: ipAddress.trim(),
  })
}

// --- CAPTCHA (Cloudflare Turnstile) ---

export type CaptchaValidationResult =
  | { valid: true }
  | { valid: false; reason: string }

const TURNSTILE_VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify'

/**
 * Verifies the Turnstile token with Cloudflare. Secret key must be in env (TURNSTILE_SECRET_KEY).
 */
export async function validateCaptcha(
  token: string | null | undefined,
  remoteIp?: string | null
): Promise<CaptchaValidationResult> {
  const secret = process.env.TURNSTILE_SECRET_KEY
  if (!secret) {
    // In development, allow signup without CAPTCHA when secret is not set
    if (process.env.NODE_ENV === 'development') {
      return { valid: true }
    }
    console.error('TURNSTILE_SECRET_KEY is not set')
    return { valid: false, reason: 'Verification is not configured. Please try again later.' }
  }

  if (!token?.trim()) {
    return { valid: false, reason: 'Please complete the verification challenge.' }
  }

  const body = new URLSearchParams()
  body.set('secret', secret)
  body.set('response', token.trim())
  if (remoteIp?.trim()) {
    body.set('remoteip', remoteIp.trim())
  }

  let res: Response
  try {
    res = await fetch(TURNSTILE_VERIFY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    })
  } catch (err) {
    console.error('Turnstile verify request failed:', err)
    return { valid: false, reason: 'Verification failed. Please try again.' }
  }

  let data: { success?: boolean; 'error-codes'?: string[] }
  try {
    data = (await res.json()) as { success?: boolean; 'error-codes'?: string[] }
  } catch {
    return { valid: false, reason: 'Verification failed. Please try again.' }
  }

  if (data.success) {
    return { valid: true }
  }

  const codes = data['error-codes'] ?? []
  if (codes.includes('timeout-or-duplicate')) {
    return { valid: false, reason: 'Verification expired. Please refresh and try again.' }
  }
  return { valid: false, reason: 'Verification failed. Please try again.' }
}

// --- Logging blocked attempts ---

export type LogBlockedParams = {
  email: string
  ip_address: string | null
  user_agent: string | null
  blocked_reason: string
}

/**
 * Inserts a row into signup_attempt_logs for auditing blocked signups.
 */
export async function logBlockedAttempt(params: LogBlockedParams): Promise<void> {
  const supabase = getAdminSupabase()
  await supabase.from('signup_attempt_logs').insert({
    email: params.email.trim().toLowerCase(),
    ip_address: params.ip_address?.trim() ?? null,
    user_agent: params.user_agent?.trim() ?? null,
    blocked_reason: params.blocked_reason,
  })
}
