/**
 * TikTok oEmbed helper — TikTok no longer serves og:* tags to scrapers,
 * so title/thumbnail must come from https://www.tiktok.com/oembed.
 */

export type TikTokOEmbedResult = {
  title: string | null
  description: string | null
  image: string | null
  author_name: string | null
  html: string | null
}

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&#8217;/g, "'")
    .replace(/&#8216;/g, "'")
    .replace(/&#8220;/g, '"')
    .replace(/&#8221;/g, '"')
    .replace(/&apos;/g, "'")
}

function extractCaptionFromHtml(html: string): string | null {
  const captionMatch =
    html.match(/<blockquote[^>]*>\s*<p[^>]*>([^<]+)<\/p>/i) ||
    html.match(/<blockquote[^>]*>\s*<p[^>]*>([\s\S]*?)<\/p>/i) ||
    html.match(/<p[^>]*>([^<]{10,})<\/p>/i)

  if (!captionMatch?.[1]) return null
  const text = decodeHtmlEntities(captionMatch[1].replace(/<[^>]*>/g, ''))
    .replace(/\s+/g, ' ')
    .trim()
  return text || null
}

function cleanTikTokTitle(title: string): string {
  return decodeHtmlEntities(title)
    .replace(/^TikTok\s*[-–—]\s*/i, '')
    .replace(/^@[\w.-]+\s*[-–—]\s*/i, '')
    .replace(/\s+/g, ' ')
    .trim()
}

export function isTikTokUrl(url: string): boolean {
  try {
    const host = new URL(url).hostname.toLowerCase()
    return (
      host.includes('tiktok.com') ||
      host === 'vm.tiktok.com' ||
      host === 'vt.tiktok.com'
    )
  } catch {
    return false
  }
}

/** Full video/photo URLs already work with oEmbed — skip redirect chase. */
export function isTikTokCanonicalVideoUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    const host = parsed.hostname.toLowerCase()
    if (!host.includes('tiktok.com')) return false
    if (host.startsWith('vm.') || host.startsWith('vt.')) return false
    return /\/(video|photo)\/\d+/.test(parsed.pathname)
  } catch {
    return false
  }
}

function needsTikTokResolve(url: string): boolean {
  try {
    const parsed = new URL(url)
    const host = parsed.hostname.toLowerCase()
    if (host.startsWith('vm.') || host.startsWith('vt.')) return true
    if (parsed.pathname.startsWith('/t/')) return true
    // Share links without /video/ or /photo/
    if (host.includes('tiktok.com') && !isTikTokCanonicalVideoUrl(url)) return true
    return false
  } catch {
    return false
  }
}

/**
 * Resolve TikTok short/share links (vm.*, vt.*, /t/) without downloading page bodies.
 * Follows Location headers with redirect: 'manual'.
 */
export async function resolveTikTokCanonicalUrl(url: string): Promise<string> {
  if (!needsTikTokResolve(url)) return url

  let current = url
  const seen = new Set<string>()

  for (let i = 0; i < 8; i++) {
    if (seen.has(current)) break
    seen.add(current)
    if (isTikTokCanonicalVideoUrl(current)) return current

    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 6000)
      const response = await fetch(current, {
        method: 'GET',
        redirect: 'manual',
        signal: controller.signal,
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
      })
      clearTimeout(timeoutId)

      // Drop body immediately
      try {
        await response.body?.cancel()
      } catch {
        // ignore
      }

      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get('location')
        if (!location) break
        current = new URL(location, current).toString()
        continue
      }

      // Some environments return the final URL even with manual redirect
      if (response.url && response.url !== current) {
        current = response.url
        continue
      }
      break
    } catch {
      break
    }
  }

  return current
}

/**
 * Fetch TikTok oEmbed. Returns null on hard failure.
 */
export async function fetchTikTokOEmbed(url: string): Promise<TikTokOEmbedResult | null> {
  try {
    const oembedUrl = `https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`
    const response = await fetch(oembedUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        Accept: 'application/json, text/html, */*',
        'Accept-Language': 'en-US,en;q=0.9',
        Referer: 'https://www.tiktok.com/',
        Origin: 'https://www.tiktok.com',
      },
      cache: 'no-store',
    })

    if (!response.ok) {
      const errorText = await response.text().catch(() => '')
      console.debug(
        `TikTok oEmbed failed: ${response.status}`,
        errorText.substring(0, 150)
      )
      return null
    }

    const data = await response.json()
    if (data.error) {
      console.debug('TikTok oEmbed returned error payload')
      return null
    }

    const captionFromHtml =
      typeof data.html === 'string' ? extractCaptionFromHtml(data.html) : null
    const titleRaw =
      typeof data.title === 'string' ? cleanTikTokTitle(data.title) : null
    const description = captionFromHtml || titleRaw || null
    const title = titleRaw || captionFromHtml || null

    return {
      title,
      description,
      image: typeof data.thumbnail_url === 'string' ? data.thumbnail_url : null,
      author_name: typeof data.author_name === 'string' ? data.author_name : null,
      html: typeof data.html === 'string' ? data.html : null,
    }
  } catch (error) {
    console.debug('TikTok oEmbed error:', error)
    return null
  }
}

/**
 * Resolve short link if needed, then oEmbed. Tries the given URL first
 * (canonical video URLs work without resolving).
 */
export async function fetchTikTokMetadata(url: string): Promise<TikTokOEmbedResult | null> {
  const first = await fetchTikTokOEmbed(url)
  if (first && (first.image || first.title || first.description)) {
    return first
  }

  if (isTikTokCanonicalVideoUrl(url)) {
    return first
  }

  const canonical = await resolveTikTokCanonicalUrl(url)
  if (canonical !== url) {
    const second = await fetchTikTokOEmbed(canonical)
    if (second && (second.image || second.title || second.description)) {
      return second
    }
  }

  return first
}
