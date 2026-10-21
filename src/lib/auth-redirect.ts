/**
 * Safe post-login redirect helpers.
 * Only allow relative same-origin paths (block open redirects).
 */

export function safeRedirectPath(raw: string | null | undefined): string | null {
  if (!raw) return null
  let path = raw.trim()
  try {
    path = decodeURIComponent(path)
  } catch {
    // already decoded or malformed — use as-is
  }
  if (!path.startsWith('/') || path.startsWith('//')) return null
  if (path.includes('://')) return null
  return path
}

/** Build path + query for redirect= (e.g. /add?url=…). */
export function intendedPathFromLocation(pathname: string, search: string): string {
  const q = search.startsWith('?') ? search.slice(1) : search
  return q ? `${pathname}?${q}` : pathname
}

export const REDIRECT_COOKIE = 'redirect_after_login'
/** 24h — long enough for email confirmation / magic-link opens. */
export const REDIRECT_COOKIE_MAX_AGE = 60 * 60 * 24

export function setRedirectCookie(path: string): void {
  if (typeof document === 'undefined') return
  const safe = safeRedirectPath(path)
  if (!safe) return
  document.cookie = `${REDIRECT_COOKIE}=${encodeURIComponent(safe)}; path=/; max-age=${REDIRECT_COOKIE_MAX_AGE}; samesite=lax`
}
