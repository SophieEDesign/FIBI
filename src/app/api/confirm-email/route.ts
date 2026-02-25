import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAdminSupabase } from '@/lib/admin'
import { verifyConfirmEmailToken } from '@/lib/confirm-email-token'

export const dynamic = 'force-dynamic'

/**
 * GET /api/confirm-email?token=xxx
 * Verifies the token, sets profiles.email_verified_at, then redirects.
 * If user is not logged in, redirects to /login?message=confirmed so they see
 * "Email confirmed!" after signing in; otherwise redirects to /app?confirmed=true.
 */
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token')
  const origin = request.nextUrl.origin

  if (!token) {
    const appUrl = new URL('/app', origin)
    appUrl.searchParams.set('confirm', 'error')
    return NextResponse.redirect(appUrl)
  }

  const userId = verifyConfirmEmailToken(token)
  if (!userId) {
    const appUrl = new URL('/app', origin)
    appUrl.searchParams.set('confirm', 'expired')
    return NextResponse.redirect(appUrl)
  }

  const supabase = getAdminSupabase()
  const now = new Date().toISOString()

  const { error: profileError } = await supabase
    .from('profiles')
    .update({ email_verified_at: now, updated_at: now })
    .eq('id', userId)

  if (profileError) {
    console.error('Confirm email update failed:', profileError)
    const appUrl = new URL('/app', origin)
    appUrl.searchParams.set('confirm', 'error')
    return NextResponse.redirect(appUrl)
  }

  // So login works: set Supabase Auth email_confirmed_at when app confirms via this link
  const { error: authError } = await supabase.auth.admin.updateUserById(userId, {
    email_confirm: true,
  } as { email_confirm?: boolean })

  if (authError) {
    console.error('Auth email_confirm update failed (user can still use app):', authError)
    // Don't fail the flow — profile is updated; only Auth state may be out of sync
  }

  // If user has no session, send to login so they see "Email confirmed!" after signing in
  const serverClient = await createClient(request)
  const { data: { user } } = await serverClient.auth.getUser()
  if (!user) {
    const loginUrl = new URL('/login', origin)
    loginUrl.searchParams.set('message', 'confirmed')
    return NextResponse.redirect(loginUrl)
  }

  const appUrl = new URL('/app', origin)
  appUrl.searchParams.set('confirmed', 'true')
  return NextResponse.redirect(appUrl)
}
