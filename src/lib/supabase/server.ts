import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { NextRequest } from 'next/server'

/**
 * Create a Supabase server client
 * 
 * For Server Components: createClient()
 * For API Routes: createClient(request)
 */
export async function createClient(request?: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !key) {
    throw new Error(
      'Missing Supabase environment variables. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY'
    )
  }

  // For API routes, read cookies from request headers
  if (request) {
    return createServerClient(url, key, {
      cookies: {
        getAll() {
          // Read cookies from request headers
          const cookieHeader = request.headers.get('cookie') || ''
          const cookies: Array<{ name: string; value: string }> = []
          
          if (cookieHeader) {
            // Parse cookies properly, handling URL-encoded values
            cookieHeader.split(';').forEach((cookie) => {
              const trimmed = cookie.trim()
              if (!trimmed) return
              
              const equalIndex = trimmed.indexOf('=')
              if (equalIndex === -1) return
              
              const name = trimmed.substring(0, equalIndex).trim()
              const value = trimmed.substring(equalIndex + 1).trim()
              
              if (name) {
                cookies.push({
                  name,
                  value,
                })
              }
            })
          }
          
          return cookies
        },
        setAll(cookiesToSet: Array<{ name: string; value: string; options?: any }>) {
          // In API routes, we can't set cookies directly in the response
          // They need to be set via NextResponse
          // This is handled by the caller if needed
        },
      },
    })
  }

  // For Server Components, use Next.js cookies()
  const cookieStore = await cookies()

  return createServerClient(
    url,
    key,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet: Array<{ name: string; value: string; options?: any }>) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  )
}

