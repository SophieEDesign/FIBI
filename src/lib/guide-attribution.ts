/** Guide signup attribution — cookie + helpers for traffic measurement. */

export const GUIDE_ATTR_COOKIE = 'fibi_guide_attr'
const GUIDE_ATTR_MAX_AGE_DAYS = 30

export function setGuideAttribution(guideId: string): void {
  if (typeof document === 'undefined' || !guideId) return
  const maxAge = GUIDE_ATTR_MAX_AGE_DAYS * 24 * 60 * 60
  document.cookie = `${GUIDE_ATTR_COOKIE}=${encodeURIComponent(guideId)}; path=/; max-age=${maxAge}; SameSite=Lax`
}

export function getGuideAttributionFromCookie(): string | null {
  if (typeof document === 'undefined') return null
  const match = document.cookie.match(new RegExp(`(?:^|; )${GUIDE_ATTR_COOKIE}=([^;]*)`))
  if (!match?.[1]) return null
  try {
    return decodeURIComponent(match[1])
  } catch {
    return null
  }
}

export function clearGuideAttribution(): void {
  if (typeof document === 'undefined') return
  document.cookie = `${GUIDE_ATTR_COOKIE}=; path=/; max-age=0; SameSite=Lax`
}

export function signupHrefForGuide(slug: string, redirectPath: string): string {
  const params = new URLSearchParams({
    redirect: redirectPath,
    from_guide: slug,
  })
  return `/signup?${params.toString()}`
}
