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
  const { error } = await supabase
    .from('profiles')
    .update({ email_verified_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('id', userId)

  if (error) {
    console.error('Confirm email update failed:', error)
    const appUrl = new URL('/app', origin)
    appUrl.searchParams.set('confirm', 'error')
    return NextResponse.redirect(appUrl)
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
