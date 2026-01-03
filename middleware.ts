import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(req: NextRequest) {
  return NextResponse.next()
}

export const config = {
  // Explicitly exclude static files including manifest.json
  // This ensures middleware never touches manifest.json or other static assets
  matcher: [
    '/((?!manifest\\.json|_next|favicon\\.ico|icon\\.svg|sw\\.js).*)',
  ],
}

