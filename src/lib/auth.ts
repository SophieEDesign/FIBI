import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { createClient, createClientWithToken } from '@/lib/supabase/server'
import type { SupabaseClient, User } from '@supabase/supabase-js'
import { clientIp, rateLimit } from '@/lib/rate-limit'
import { isAnonymousUser } from '@/lib/anonymous-auth'

export type RequireUserResult =
  | { user: User; userId: string; supabase: SupabaseClient }
  | NextResponse

/**
 * Verify the request is from an authenticated user.
 * Accepts Authorization: Bearer <token> first, then request cookies, then RSC cookies.
 * Returns an RLS-bound Supabase client for the resolved identity.
 */
export async function requireUser(request?: NextRequest): Promise<RequireUserResult> {
  const authHeader = request?.headers.get('Authorization')
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : null

  if (token) {
    const supabase = createClientWithToken(token)
    const { data, error } = await supabase.auth.getUser(token)
    if (data.user && !error) {
      return { user: data.user, userId: data.user.id, supabase }
    }
  }

  if (request) {
    const supabase = await createClient(request)
    const { data, error } = await supabase.auth.getUser()
    if (data.user && !error) {
      return { user: data.user, userId: data.user.id, supabase }
    }
  }

  const supabase = await createClient()
  const { data, error } = await supabase.auth.getUser()
  if (data.user && !error) {
    return { user: data.user, userId: data.user.id, supabase }
  }

  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}

export type EnrichAccessResult =
  | { mode: 'user'; user: User; userId: string; supabase: SupabaseClient }
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
    return {
      mode: 'user',
      user: auth.user,
      userId: auth.userId,
      supabase: auth.supabase,
    }
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
