import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

/**
 * Get the site URL for redirects
 * Uses the request origin (which is correct for the current request)
 * or falls back to environment variables
 */
function getRedirectOrigin(request: NextRequest): string {
  const origin = request.headers.get('origin') || request.nextUrl.origin

  if (origin.includes('localhost')) {
    if (process.env.NEXT_PUBLIC_SITE_URL) {
      return process.env.NEXT_PUBLIC_SITE_URL
    }
    if (process.env.VERCEL_URL) {
      return `https://${process.env.VERCEL_URL}`
    }
  }

  return origin
}

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const type = requestUrl.searchParams.get('type') // 'signup', 'recovery', or magic-link email
  const oauthError = requestUrl.searchParams.get('error')
  const errorDescription = requestUrl.searchParams.get('error_description')
  const origin = getRedirectOrigin(request)

  // OAuth / magic-link provider cancelled or failed
  if (oauthError) {
    const loginUrl = new URL('/login', origin)
    loginUrl.searchParams.set('error', oauthError)
    if (errorDescription) {
      loginUrl.searchParams.set('error_description', errorDescription)
    }
    return NextResponse.redirect(loginUrl)
  }

  if (code) {
    const supabase = await createClient()

    const { error, data } = await supabase.auth.exchangeCodeForSession(code)

    if (!error && data.session) {
      if (type === 'recovery') {
        const resetUrl = new URL('/reset-password', origin)
        return NextResponse.redirect(resetUrl)
      }

      // OAuth / magic-link emails are already verified by the provider
      const user = data.session.user
      if (user?.email_confirmed_at || user?.app_metadata?.provider) {
        const now = new Date().toISOString()
        const { error: profileError } = await supabase
          .from('profiles')
          .update({ email_verified_at: now, updated_at: now })
          .eq('id', user.id)
          .is('email_verified_at', null)
        if (profileError) {
          console.error('Auth callback profile verify update failed:', profileError.message)
        }
      }

      const cookieHeader = request.headers.get('cookie') || ''
      const match = cookieHeader.match(/redirect_after_login=([^;]+)/)
      const redirectPath = match ? decodeURIComponent(match[1].trim()) : null
      const safePath =
        redirectPath && redirectPath.startsWith('/') && !redirectPath.startsWith('//')
          ? redirectPath
          : null

      const redirectUrl = new URL(safePath || '/app', origin)
      if (!safePath) redirectUrl.searchParams.set('confirmed', 'true')

      const res = NextResponse.redirect(redirectUrl)
      res.cookies.set('redirect_after_login', '', { path: '/', maxAge: 0 })
      return res
    }

    if (error) {
      console.error('Auth callback exchange failed:', error.message)
      const loginUrl = new URL('/login', origin)
      loginUrl.searchParams.set('error', 'auth_failed')
      return NextResponse.redirect(loginUrl)
    }
  }

  return NextResponse.redirect(new URL('/login', origin))
}
