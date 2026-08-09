import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import type { User } from '@supabase/supabase-js'

export type RequireAdminResult =
  | { user: User; userId: string }
  | NextResponse

/**
 * Verify the current request is from an authenticated user with role = 'admin'.
 * Accepts either cookies or Authorization: Bearer <token> via requireUser.
 */
export async function requireAdmin(request?: NextRequest): Promise<RequireAdminResult> {
  const auth = await requireUser(request)
  if (auth instanceof NextResponse) return auth

  const { data: profile, error: profileError } = await auth.supabase
    .from('profiles')
    .select('role')
    .eq('id', auth.userId)
    .single()

  if (profileError || !profile || profile.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  return { user: auth.user, userId: auth.userId }
}

/**
 * Create a Supabase client with the service role key for admin operations
 * (e.g. calling get_admin_user_overview_by_id / get_admin_user_overview_founding_eligible, updating profiles).
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
