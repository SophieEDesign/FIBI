import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/middleware'

const PROTECTED_PATHS = ['/app', '/add', '/item', '/profile']

function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`)
  )
}

export async function middleware(req: NextRequest) {
  if (!isProtectedPath(req.nextUrl.pathname)) {
    return NextResponse.next()
  }

  try {
    const { supabase, response } = await createClient(req)
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      const loginUrl = new URL('/login', req.url)
      const intended = req.nextUrl.pathname + req.nextUrl.search
      loginUrl.searchParams.set('redirect', intended)
      return NextResponse.redirect(loginUrl)
    }

    return response
  } catch {
    const loginUrl = new URL('/login', req.url)
    const intended = req.nextUrl.pathname + req.nextUrl.search
    loginUrl.searchParams.set('redirect', intended)
    return NextResponse.redirect(loginUrl)
  }
}

export const config = {
  matcher: ['/app/:path*', '/add/:path*', '/item/:path*', '/profile/:path*'],
}

