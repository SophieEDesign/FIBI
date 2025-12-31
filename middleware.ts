import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(req: NextRequest) {
  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!login|share|share-target|manifest.json|icon|favicon.ico|api).*)',
  ],
}

