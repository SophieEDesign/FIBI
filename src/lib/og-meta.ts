/**
 * Shared Open Graph / meta tag extraction for metadata and oEmbed APIs.
 * Handles multiple attribute orders and quote styles for reliability with
 * Facebook, Instagram, and other platforms.
 */

export function decodeMetaContent(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
}

/**
 * Extract content of a meta tag by property or name.
 * Tries: property="og:x" content="y", content="y" property="og:x", and single-quote variants.
 */
function getMetaContent(html: string, propertyOrName: string, isProperty: boolean): string | null {
  const attr = isProperty ? 'property' : 'name'
  const patterns = [
    new RegExp(`<meta[^>]*${attr}\\s*=\\s*["']${escapeRegex(propertyOrName)}["'][^>]*content\\s*=\\s*["']([^"']+)["']`, 'i'),
    new RegExp(`<meta[^>]*content\\s*=\\s*["']([^"']+)["'][^>]*${attr}\\s*=\\s*["']${escapeRegex(propertyOrName)}["']`, 'i'),
    new RegExp(`<meta[^>]*${attr}\\s*=\\s*['']${escapeRegex(propertyOrName)}[''][^>]*content\\s*=\\s*['']([^'']+)['']`, 'i'),
    new RegExp(`<meta[^>]*content\\s*=\\s*['']([^'']+)[''][^>]*${attr}\\s*=\\s*['']${escapeRegex(propertyOrName)}['']`, 'i'),
  ]
  for (const re of patterns) {
    const m = html.match(re)
    if (m?.[1]) return decodeMetaContent(m[1].trim())
  }
  return null
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export interface ExtractedOgMeta {
  title: string | null
  description: string | null
  image: string | null
}

export function extractOgMetaFromHtml(html: string): ExtractedOgMeta {
  const title =
    getMetaContent(html, 'og:title', true) ??
    (() => {
      const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i)
      return titleMatch ? decodeMetaContent(titleMatch[1].trim()) : null
    })()

  const description =
    getMetaContent(html, 'og:description', true) ??
    getMetaContent(html, 'description', false)

  let image =
    getMetaContent(html, 'og:image', true) ??
    getMetaContent(html, 'og:image:secure_url', true) ??
    getMetaContent(html, 'twitter:image', true) ??
    getMetaContent(html, 'twitter:image', false) // name="twitter:image"

  return { title, description, image }
}
