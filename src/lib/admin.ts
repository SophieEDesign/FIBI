import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { createClient, createClientWithToken } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import type { User } from '@supabase/supabase-js'

export type RequireAdminResult =
  | { user: User; userId: string }
  | NextResponse

/**
 * Verify the current request is from an authenticated user with role = 'admin'.
 * Accepts either cookies (createClient(request)) or Authorization: Bearer <token>.
 * Bearer token is more reliable when cookies are blocked (e.g. Vercel Deployment Protection).
 */
export async function requireAdmin(request?: NextRequest): Promise<RequireAdminResult> {
  const authHeader = request?.headers.get('Authorization')
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : null

  let user: User | null = null
  let authError: Error | null = null
  let supabaseForProfile: Awaited<ReturnType<typeof createClient>> | ReturnType<typeof createClientWithToken> | null = null

  if (token) {
    const supabase = createClientWithToken(token)
    const result = await supabase.auth.getUser(token)
    user = result.data.user
    authError = result.error ?? null
    if (user) supabaseForProfile = supabase
  }

  if (!user && request) {
    const supabase = await createClient(request)
    const result = await supabase.auth.getUser()
    user = result.data.user
    authError = result.error ?? null
    if (user) supabaseForProfile = supabase
  }

  if (!user && supabaseForProfile === null) {
    const supabase = await createClient()
    const result = await supabase.auth.getUser()
    user = result.data.user
    authError = result.error ?? null
    if (user) supabaseForProfile = supabase
  }

  if (!user || authError || !supabaseForProfile) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: profile, error: profileError } = await supabaseForProfile
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profileError || !profile || profile.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  return { user, userId: user.id }
}

/**
 * Create a Supabase client with the service role key for admin operations
 * (e.g. reading admin_user_overview, updating profiles).
 */
export function getAdminSupabase() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL

  if (!serviceRoleKey || !supabaseUrl) {
    throw new Error(
      'Missing SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_URL'
    )
  }

  return createAdminClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}
