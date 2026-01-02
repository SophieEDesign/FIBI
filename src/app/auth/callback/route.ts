import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

/**
 * Get the site URL for redirects
 * Uses the request origin (which is correct for the current request)
 * or falls back to environment variables
 */
function getRedirectOrigin(request: NextRequest): string {
  // Use the request origin (correct for current request)
  const origin = request.headers.get('origin') || request.nextUrl.origin
  
  // If it's localhost, check for production URL in env vars
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
  const type = requestUrl.searchParams.get('type') // 'signup' or 'recovery'
  const origin = getRedirectOrigin(request)

  if (code) {
    const supabase = await createClient()
    
    // Exchange the code for a session
    const { error, data } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error && data.session) {
      // Successfully authenticated, redirect to home
      const redirectUrl = new URL('/', origin)
      redirectUrl.searchParams.set('confirmed', 'true')
      return NextResponse.redirect(redirectUrl)
    } else if (error) {
      // If there's an error, redirect to login with error message
      const loginUrl = new URL('/login', origin)
      loginUrl.searchParams.set('error', 'confirmation_failed')
      return NextResponse.redirect(loginUrl)
    }
  }

  // If no code or error, redirect to login
  return NextResponse.redirect(new URL('/login', origin))
}

