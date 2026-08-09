import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { createClient, createClientWithToken } from '@/lib/supabase/server'
import type { User } from '@supabase/supabase-js'
import { clientIp, rateLimit } from '@/lib/rate-limit'
import { isAnonymousUser } from '@/lib/anonymous-auth'

export type RequireUserResult =
  | { user: User; userId: string }
  | NextResponse

/**
 * Verify the request is from an authenticated user.
 * Accepts either cookies (createClient(request)) or Authorization: Bearer <token>.
 */
export async function requireUser(request?: NextRequest): Promise<RequireUserResult> {
  const authHeader = request?.headers.get('Authorization')
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : null

  let user: User | null = null

  if (token) {
    const supabase = createClientWithToken(token)
    const result = await supabase.auth.getUser(token)
    user = result.data.user
  }

  if (!user && request) {
    const supabase = await createClient(request)
    const result = await supabase.auth.getUser()
    user = result.data.user
  }

  if (!user) {
    const supabase = await createClient()
    const result = await supabase.auth.getUser()
    user = result.data.user
  }

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  return { user, userId: user.id }
}

export type EnrichAccessResult =
  | { mode: 'user'; user: User; userId: string }
  | { mode: 'guest'; guestKey: string }
  | NextResponse

/**
 * Allow enrich for signed-in users (including anonymous) or rate-limited guests.
 */
export async function allowEnrichAccess(request: NextRequest): Promise<EnrichAccessResult> {
  const auth = await requireUser(request)
  if (!(auth instanceof NextResponse)) {
    const key = `enrich:user:${auth.userId}`
    const limited = rateLimit(key, {
      limit: isAnonymousUser(auth.user) ? 30 : 120,
      windowMs: 60 * 60 * 1000,
    })
    if (!limited.ok) {
      return NextResponse.json(
        { error: 'Too many requests. Try again shortly.' },
        { status: 429, headers: { 'Retry-After': String(limited.retryAfterSec) } }
      )
    }
    return { mode: 'user', user: auth.user, userId: auth.userId }
  }

  const ip = clientIp(request)
  const limited = rateLimit(`enrich:guest:${ip}`, { limit: 20, windowMs: 60 * 60 * 1000 })
  if (!limited.ok) {
    return NextResponse.json(
      { error: 'Too many requests. Try again shortly.' },
      { status: 429, headers: { 'Retry-After': String(limited.retryAfterSec) } }
    )
  }
  return { mode: 'guest', guestKey: ip }
}
