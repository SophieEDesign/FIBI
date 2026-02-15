import { NextRequest, NextResponse } from 'next/server'
import { getAdminSupabase } from '@/lib/admin'
import { verifyConfirmEmailToken } from '@/lib/confirm-email-token'

export const dynamic = 'force-dynamic'

/**
 * GET /api/confirm-email?token=xxx
 * Verifies the token, sets profiles.email_verified_at, redirects to /app
 */
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token')

  if (!token) {
    const appUrl = new URL('/app', request.nextUrl.origin)
    appUrl.searchParams.set('confirm', 'error')
    return NextResponse.redirect(appUrl)
  }

  const userId = verifyConfirmEmailToken(token)
  if (!userId) {
    const appUrl = new URL('/app', request.nextUrl.origin)
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
    const appUrl = new URL('/app', request.nextUrl.origin)
    appUrl.searchParams.set('confirm', 'error')
    return NextResponse.redirect(appUrl)
  }

  // Success: redirect to app with confirmation
  const appUrl = new URL('/app', request.nextUrl.origin)
  appUrl.searchParams.set('confirmed', 'true')
  return NextResponse.redirect(appUrl)
}
