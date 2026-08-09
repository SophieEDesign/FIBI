import { createServerClient } from '@supabase/ssr'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import type { NextRequest } from 'next/server'
import { requestCookieMethods, type CookieToSet } from '@/lib/supabase/cookies'

function requireEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) {
    throw new Error(
      'Missing Supabase environment variables. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY'
    )
  }
  return { url, key }
}

/**
 * Create a Supabase server client
 *
 * For Server Components: createClient()
 * For API Routes: createClient(request)
 */
export async function createClient(request?: NextRequest) {
  const { url, key } = requireEnv()

  if (request) {
    return createServerClient(url, key, {
      cookies: requestCookieMethods(request),
    })
  }

  const cookieStore = await cookies()

  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet: CookieToSet[]) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options as Parameters<typeof cookieStore.set>[2])
          )
        } catch {
          // Called from a Server Component; middleware refreshes sessions.
        }
      },
    },
  })
}

/**
 * Create a Supabase client that sends the given JWT on every request.
 * Use in API routes when auth is via Bearer token so RLS (auth.uid()) works.
 */
export function createClientWithToken(accessToken: string) {
  const { url, key } = requireEnv()
  return createSupabaseClient(url, key, {
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  })
}
