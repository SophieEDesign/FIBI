import { createServerClient } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'
import {
  applyCookiesToResponse,
  requestCookieMethods,
  type CookieToSet,
} from '@/lib/supabase/cookies'

/**
 * Prefer the request URL origin (www.fibi.world vs fibi.world).
 * Avoid Origin header — often missing on OAuth GET redirects.
 */
function getRedirectOrigin(request: NextRequest): string {
  const origin = request.nextUrl.origin

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

  if (oauthError) {
    const loginUrl = new URL('/login', origin)
    loginUrl.searchParams.set('error', oauthError)
    if (errorDescription) {
      loginUrl.searchParams.set('error_description', errorDescription)
    }
    return NextResponse.redirect(loginUrl)
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    const loginUrl = new URL('/login', origin)
    loginUrl.searchParams.set('error', 'auth_failed')
    loginUrl.searchParams.set('error_description', 'Auth is not configured')
    return NextResponse.redirect(loginUrl)
  }

  if (code) {
    // Collect session cookies so we can attach them to the redirect response.
    // Returning NextResponse.redirect() after cookies().set() can drop the session.
    const pendingCookies: CookieToSet[] = []

    let pendingHeaders: Record<string, string> = {}

    const supabase = createServerClient(supabaseUrl, supabaseKey, {
      cookies: requestCookieMethods(request, (cookiesToSet, headers) => {
        pendingCookies.push(...cookiesToSet)
        pendingHeaders = headers
      }),
    })

    const { error, data } = await supabase.auth.exchangeCodeForSession(code)

    if (!error && data.session) {
      if (type === 'recovery') {
        const resetUrl = new URL('/reset-password', origin)
        const res = NextResponse.redirect(resetUrl)
        applyCookiesToResponse(res, pendingCookies, pendingHeaders)
        return res
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

      const redirectCookie = request.cookies.get('redirect_after_login')?.value
      const redirectPath = redirectCookie ? decodeURIComponent(redirectCookie) : null
      const safePath =
        redirectPath && redirectPath.startsWith('/') && !redirectPath.startsWith('//')
          ? redirectPath
          : null

      const redirectUrl = new URL(safePath || '/app', origin)
      if (!safePath) redirectUrl.searchParams.set('confirmed', 'true')

      const res = NextResponse.redirect(redirectUrl)
      applyCookiesToResponse(res, pendingCookies, pendingHeaders)
      res.cookies.set('redirect_after_login', '', { path: '/', maxAge: 0 })
      return res
    }

    console.error('Auth callback exchange failed:', error?.message || 'no session')
    const loginUrl = new URL('/login', origin)
    loginUrl.searchParams.set('error', 'auth_failed')
    if (error?.message) {
      loginUrl.searchParams.set('error_description', error.message)
    }
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.redirect(new URL('/login', origin))
}
