import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { applyCookiesToResponse, requestCookieMethods } from '@/lib/supabase/cookies'

/**
 * Create a Supabase client for use in middleware.
 * Handles cookies from request and can update response cookies.
 */
export async function createClient(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !key) {
    throw new Error('Missing Supabase environment variables')
  }

  const response = NextResponse.next({ request })
  const supabase = createServerClient(url, key, {
    cookies: requestCookieMethods(request, (cookiesToSet) => {
      applyCookiesToResponse(response, cookiesToSet)
    }),
  })

  return { supabase, response }
}
