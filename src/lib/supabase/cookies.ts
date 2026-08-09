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
  onSetAll?: (cookies: CookieToSet[]) => void
) {
  return {
    getAll() {
      return request.cookies.getAll()
    },
    setAll(cookiesToSet: CookieToSet[]) {
      onSetAll?.(cookiesToSet)
    },
  }
}

/** Write cookies onto a NextResponse (middleware / signout / callback redirect). */
export function applyCookiesToResponse(response: NextResponse, cookies: CookieToSet[]) {
  cookies.forEach(({ name, value, options }) => {
    response.cookies.set(name, value, options as Parameters<typeof response.cookies.set>[2])
  })
}
