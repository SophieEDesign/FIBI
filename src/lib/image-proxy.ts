/**
 * Returns a proxied image URL for CDNs that block direct access (e.g. Facebook/Instagram).
 * Use for <img src> so preview images load instead of 403.
 */
export function getProxiedImageUrl(url: string | null | undefined): string | null {
  if (!url) return null
  try {
    let decoded = url
    if (url.includes('&amp;') || url.includes('&lt;') || url.includes('&gt;')) {
      if (typeof document !== 'undefined') {
        const div = document.createElement('div')
        div.innerHTML = url
        decoded = div.textContent || div.innerText || url
      } else {
        decoded = url.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
      }
    }
    const parsed = new URL(decoded)
    const host = parsed.hostname.toLowerCase()
    const needsProxy =
      host.includes('fbcdn.net') ||
      host.includes('cdninstagram.com') ||
      (host.includes('instagram.com') && decoded.includes('/p/')) ||
      (host.includes('facebook.com') && decoded.includes('/photos/')) ||
      host.includes('tiktokcdn.com') ||
      (host.includes('tiktok.com') && decoded.includes('/obj/'))
    if (needsProxy) return `/api/image-proxy?url=${encodeURIComponent(decoded)}`
    return decoded
  } catch {
    return url
  }
}
