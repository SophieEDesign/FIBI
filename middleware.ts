import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(req: NextRequest) {
  // This middleware does nothing - all routes pass through
  // Static files (manifest.json, sw.js, etc.) are served directly by Next.js
  // The manifest.json route handler at src/app/manifest.json/route.ts handles that file
  return NextResponse.next()
}

export const config = {
  // Empty matcher = middleware never runs
  // This is the safest approach - ensures static files are NEVER touched
  matcher: [],
}

