import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const type = requestUrl.searchParams.get('type') // 'signup' or 'recovery'

  if (code) {
    const supabase = await createClient()
    
    // Exchange the code for a session
    const { error, data } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error && data.session) {
      // Successfully authenticated, redirect to home
      const redirectUrl = new URL('/', request.url)
      redirectUrl.searchParams.set('confirmed', 'true')
      return NextResponse.redirect(redirectUrl)
    } else if (error) {
      // If there's an error, redirect to login with error message
      const loginUrl = new URL('/login', request.url)
      loginUrl.searchParams.set('error', 'confirmation_failed')
      return NextResponse.redirect(loginUrl)
    }
  }

  // If no code or error, redirect to login
  return NextResponse.redirect(new URL('/login', request.url))
}

