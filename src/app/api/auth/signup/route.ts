import { NextRequest, NextResponse } from 'next/server'
import { getAdminSupabase } from '@/lib/admin'
import {
  validateEmailPattern,
  validateRateLimit,
  validateCaptcha,
  logBlockedAttempt,
  recordSignupAttempt,
} from '@/lib/signupProtection'

export const dynamic = 'force-dynamic'

function getClientIp(request: NextRequest): string | null {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) {
    return forwarded.split(',')[0]?.trim() ?? null
  }
  return request.headers.get('x-real-ip') ?? null
}

function getRedirectUrl(request: NextRequest): string {
  const origin = request.nextUrl.origin
  return `${origin}/auth/callback`
}

export async function POST(request: NextRequest) {
  const ip = getClientIp(request)
  const userAgent = request.headers.get('user-agent') ?? null

  let body: { email?: string; password?: string; captchaToken?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { error: 'Invalid request body.' },
      { status: 400 }
    )
  }

  const email = typeof body.email === 'string' ? body.email.trim() : ''
  const password = typeof body.password === 'string' ? body.password : ''
  const captchaToken = typeof body.captchaToken === 'string' ? body.captchaToken : null

  if (!email || !password) {
    return NextResponse.json(
      { error: 'Email and password are required.' },
      { status: 400 }
    )
  }

  if (password.length < 6) {
    return NextResponse.json(
      { error: 'Password must be at least 6 characters long.' },
      { status: 400 }
    )
  }

  // 1) Rate limit (2/min, 5/hour)
  const rateLimit = await validateRateLimit(ip)
  if (!rateLimit.allowed) {
    await logBlockedAttempt({
      email,
      ip_address: ip,
      user_agent: userAgent,
      blocked_reason: rateLimit.reasonCode ?? 'rate_limit',
    })
    return NextResponse.json(
      { error: rateLimit.reason },
      { status: 429 }
    )
  }

  // 2) Email pattern (disposable, SMS gateway, excessive dots)
  const emailValidation = validateEmailPattern(email)
  if (!emailValidation.valid) {
    await logBlockedAttempt({
      email,
      ip_address: ip,
      user_agent: userAgent,
      blocked_reason: 'email_pattern',
    })
    return NextResponse.json(
      { error: emailValidation.reason },
      { status: 400 }
    )
  }

  // 3) CAPTCHA
  const captchaResult = await validateCaptcha(captchaToken, ip)
  if (!captchaResult.valid) {
    await logBlockedAttempt({
      email,
      ip_address: ip,
      user_agent: userAgent,
      blocked_reason: 'captcha_failed',
    })
    return NextResponse.json(
      { error: captchaResult.reason },
      { status: 400 }
    )
  }

  // Record attempt for rate limiting (before createUser so we count even if Supabase fails)
  await recordSignupAttempt(ip)

  const redirectUrl = getRedirectUrl(request)
  const supabase = getAdminSupabase()

  type CreateUserOptions = Parameters<typeof supabase.auth.admin.createUser>[0]
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: false,
    email_redirect_to: redirectUrl,
  } as CreateUserOptions)

  if (error) {
    // Do not log as blocked - we already recorded the attempt; user may retry with same email
    const message = error.message ?? 'Sign up failed. Please try again.'
    if (
      message.includes('already registered') ||
      message.includes('already exists') ||
      message.includes('User already registered')
    ) {
      return NextResponse.json(
        { error: 'An account with this email already exists. Please sign in instead.' },
        { status: 409 }
      )
    }
    return NextResponse.json(
      { error: message },
      { status: 400 }
    )
  }

  if (!data?.user) {
    return NextResponse.json(
      { error: 'Sign up completed but something went wrong. Please try signing in.' },
      { status: 500 }
    )
  }

  return NextResponse.json({
    message: 'Account created. Please check your email to confirm your account, then you can sign in.',
  })
}
