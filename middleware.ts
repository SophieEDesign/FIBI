import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(req: NextRequest) {
  return NextResponse.next()
}

export const config = {
  matcher: [
    // Exclude public routes and static assets
    // manifest.json is served via route handler, so exclude it from middleware
    '/((?!login|share|share-target|manifest|icon|favicon.ico|api|_next).*)',
  ],
}

