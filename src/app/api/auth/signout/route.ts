import { createServerClient } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'

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

  const cookieNames: string[] = []
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        const cookieHeader = request.headers.get('cookie') || ''
        const out: Array<{ name: string; value: string }> = []
        if (cookieHeader) {
          cookieHeader.split(';').forEach((cookie) => {
            const trimmed = cookie.trim()
            if (!trimmed) return
            const eq = trimmed.indexOf('=')
            if (eq === -1) return
            const name = trimmed.substring(0, eq).trim()
            let value = trimmed.substring(eq + 1).trim()
            if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
              value = value.slice(1, -1)
            }
            try {
              value = decodeURIComponent(value)
            } catch {
              // keep value
            }
            if (name) {
              out.push({ name, value })
              cookieNames.push(name)
            }
          })
        }
        return out
      },
      setAll(cookiesToSet: Array<{ name: string; value: string; options?: Record<string, unknown> }>) {
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, { path: '/', ...options })
        })
      },
    },
  })

  await supabase.auth.signOut()

  // Force-clear any Supabase auth cookies so the next request (e.g. /login) sees no session.
  // Prevents "flash" where login page redirects back to /app because getSession() still had cookies.
  const clearOptions = { path: '/', maxAge: 0 }
  for (const name of cookieNames) {
    if (name.startsWith('sb-') && name.includes('auth-token')) {
      response.cookies.set(name, '', clearOptions)
    }
  }

  return response
}

export async function GET(request: NextRequest) {
  return signOut(request)
}

export async function POST(request: NextRequest) {
  return signOut(request)
}
