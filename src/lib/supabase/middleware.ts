import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

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
    cookies: {
      getAll() {
        const cookieHeader = request.headers.get('cookie') || ''
        const cookies: Array<{ name: string; value: string }> = []
        if (cookieHeader) {
          cookieHeader.split(';').forEach((cookie) => {
            const trimmed = cookie.trim()
            if (!trimmed) return
            const equalIndex = trimmed.indexOf('=')
            if (equalIndex === -1) return
            const name = trimmed.substring(0, equalIndex).trim()
            let value = trimmed.substring(equalIndex + 1).trim()
            if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
              value = value.slice(1, -1)
            }
            try {
              value = decodeURIComponent(value)
            } catch {
              // keep original
            }
            if (name) cookies.push({ name, value })
          })
        }
        return cookies
      },
      setAll(cookiesToSet: Array<{ name: string; value: string; options?: Record<string, unknown> }>) {
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options)
        })
      },
    },
  })

  return { supabase, response }
}
