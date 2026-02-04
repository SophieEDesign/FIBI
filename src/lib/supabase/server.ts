add under the caldar and expandable list of the items and date in a list form  in date order of whats on the calenarimport { createServerClient } from '@supabase/ssr'
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

  // For API routes, use manual cookie parsing from request headers
  // This is more reliable than cookies() in API routes
  if (request) {
    return createServerClient(url, key, {
      cookies: {
        getAll() {
          // Read cookies from request headers
          const cookieHeader = request.headers.get('cookie') || ''
          const cookies: Array<{ name: string; value: string }> = []
          
          if (cookieHeader) {
            // Parse cookies properly, handling URL-encoded values
            // Split by ';' first, then handle each cookie
            cookieHeader.split(';').forEach((cookie) => {
              const trimmed = cookie.trim()
              if (!trimmed) return
              
              const equalIndex = trimmed.indexOf('=')
              if (equalIndex === -1) return
              
              const name = trimmed.substring(0, equalIndex).trim()
              let value = trimmed.substring(equalIndex + 1).trim()
              
              // Remove quotes if present
              if ((value.startsWith('"') && value.endsWith('"')) ||
                  (value.startsWith("'") && value.endsWith("'"))) {
                value = value.slice(1, -1)
              }
              
              // Decode URL-encoded values (handles %20, %3D, etc.)
              // But be careful - some cookies might have encoded = signs
              try {
                // Try decoding, but if it fails (e.g., malformed encoding), use original
                value = decodeURIComponent(value)
              } catch {
                // If decoding fails, use original value
                // This can happen if the value contains % that isn't part of encoding
              }
              
              if (name) {
                cookies.push({
                  name,
                  value,
                })
              }
            })
          }
          
          // Debug: Log cookie count (but not values for security)
          if (cookies.length > 0) {
            console.log('Parsed cookies:', cookies.length, 'cookies found')
            console.log('Cookie names:', cookies.map(c => c.name).join(', '))
          }
          
          return cookies
        },
        setAll(cookiesToSet: Array<{ name: string; value: string; options?: any }>) {
          // In API routes, we can't set cookies directly in the response
          // Supabase SSR may try to refresh the session, but for read operations
          // like getUser(), this is not required. If session refresh is needed,
          // it should be handled by the client-side code.
          // This is a no-op by design for API routes.
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

