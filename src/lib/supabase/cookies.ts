import type { NextRequest, NextResponse } from 'next/server'

export type CookieToSet = {
  name: string
  value: string
  options?: Record<string, unknown>
}

/**
 * Cookie adapter for @supabase/ssr on NextRequest.
 * Prefer request.cookies.getAll() — never manually decode Cookie headers
 * (PKCE verifier cookies break if values are re-decoded).
 */
export function requestCookieMethods(
  request: NextRequest,
  onSetAll?: (cookies: CookieToSet[], headers: Record<string, string>) => void
) {
  return {
    getAll() {
      return request.cookies.getAll()
    },
    setAll(cookiesToSet: CookieToSet[], headers: Record<string, string> = {}) {
      onSetAll?.(cookiesToSet, headers)
    },
  }
}

/** Write cookies (and optional cache headers) onto a NextResponse. */
export function applyCookiesToResponse(
  response: NextResponse,
  cookies: CookieToSet[],
  headers: Record<string, string> = {}
) {
  cookies.forEach(({ name, value, options }) => {
    response.cookies.set(name, value, options as Parameters<typeof response.cookies.set>[2])
  })
  Object.entries(headers).forEach(([key, value]) => {
    response.headers.set(key, value)
  })
}
