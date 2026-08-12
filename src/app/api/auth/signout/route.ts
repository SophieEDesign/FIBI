import { createServerClient } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'
import { applyCookiesToResponse, requestCookieMethods } from '@/lib/supabase/cookies'

/** Build redirect to login using request origin (works on preview and production). */
function getLoginRedirect(request: NextRequest): NextResponse {
  const origin = request.nextUrl.origin
  const loginUrl = new URL('/login', origin)
  return NextResponse.redirect(loginUrl)
}

/**
 * Server-side sign out: clear Supabase auth cookies and redirect to login.
 * Use this instead of client-side signOut() to avoid 403 from Supabase's
 * /auth/v1/logout endpoint (e.g. CORS or project config).
 * Supports GET (e.g. link) and POST (e.g. fetch with credentials).
 */
async function signOut(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) {
    return getLoginRedirect(request)
  }

  const origin = request.nextUrl.origin
  const loginUrl = new URL('/login', origin)
  const response = NextResponse.redirect(loginUrl)

  const authCookieNamesToClear = request.cookies
    .getAll()
    .map((c) => c.name)
    .filter((name) => name.startsWith('sb-') && name.includes('auth-token'))

  const supabase = createServerClient(url, key, {
    cookies: requestCookieMethods(request, (cookiesToSet, headers) => {
      applyCookiesToResponse(
        response,
        cookiesToSet.map(({ name, value, options }) => ({
          name,
          value,
          options: { path: '/', ...options },
        })),
        headers
      )
    }),
  })

  await supabase.auth.signOut()

  const clearOptions = { path: '/', maxAge: 0 }
  for (const name of authCookieNamesToClear) {
    response.cookies.set(name, '', clearOptions)
  }

  return response
}

export async function GET(request: NextRequest) {
  return signOut(request)
}

export async function POST(request: NextRequest) {
  return signOut(request)
}
