import { type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

export async function middleware(request: NextRequest) {
  return await updateSession(request)
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - login (login page)
     * - manifest.json (PWA manifest)
     * - icon (all icon paths)
     * - favicon.ico (favicon)
     * - share (share target route)
     * - api (API routes)
     * - _next/static and _next/image (Next.js internals)
     * - Static assets (images, fonts, etc.)
     */
    '/((?!login|manifest\\.json|icon|favicon\\.ico|share|api|_next/static|_next/image|.*\\.(?:svg|png|jpg|jpeg|gif|webp|woff|woff2|ttf|eot|ico)$).*)',
  ],
}

