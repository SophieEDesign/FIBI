import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { createClient, createClientWithToken } from '@/lib/supabase/server'
import type { User } from '@supabase/supabase-js'

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
