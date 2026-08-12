/**
 * TikTok oEmbed helper — TikTok no longer serves og:* tags to scrapers,
 * and short links (vm./vt./t/) do not work with oEmbed until resolved to a video ID.
 */

export type TikTokOEmbedResult = {
  title: string | null
  description: string | null
  image: string | null
  author_name: string | null
  html: string | null
  /** Canonical video URL used for oEmbed (useful to persist). */
  canonical_url?: string | null
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

export function isTikTokShellTitle(title: string | null | undefined): boolean {
  if (!title) return true
  const t = title.trim().toLowerCase()
  return (
    t === 'tiktok' ||
    t === 'tiktok - make your day' ||
    t === 'make your day' ||
    /^tiktok\s*[-–—]\s*make your day$/i.test(t)
  )
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

/** Extract numeric video/photo id from path or share query params. */
export function extractTikTokVideoId(url: string): string | null {
  try {
    const parsed = new URL(url)
    const pathMatch = parsed.pathname.match(/\/(?:video|photo)\/(\d+)/)
    if (pathMatch?.[1]) return pathMatch[1]

    for (const key of ['share_item_id', 'item_id', 'id']) {
      const value = parsed.searchParams.get(key)
      if (value && /^\d{5,}$/.test(value)) return value
    }

    // Rare: id embedded in hash or path segment alone
    const bare = parsed.pathname.match(/\/(\d{10,})(?:\/|$)/)
    if (bare?.[1]) return bare[1]

    return null
  } catch {
    return null
  }
}

export function isTikTokCanonicalVideoUrl(url: string): boolean {
  return !!extractTikTokVideoId(url) && isTikTokUrl(url) && !isTikTokShortLink(url)
}

export function isTikTokShortLink(url: string): boolean {
  try {
    const parsed = new URL(url)
    const host = parsed.hostname.toLowerCase()
    if (host.startsWith('vm.') || host.startsWith('vt.')) return true
    if (parsed.pathname.startsWith('/t/')) return true
    return false
  } catch {
    return false
  }
}

/** Build a URL TikTok oEmbed accepts (empty @ is fine). */
export function buildTikTokOEmbedSourceUrl(
  videoId: string,
  kind: 'video' | 'photo' = 'video'
): string {
  return `https://www.tiktok.com/@/${kind}/${videoId}`
}

/**
 * Follow short-link redirects without downloading page bodies.
 * Returns an oEmbed-friendly `/@/video/{id}` URL when possible.
 */
export async function resolveTikTokCanonicalUrl(url: string): Promise<string> {
  const existingId = extractTikTokVideoId(url)
  if (existingId && !isTikTokShortLink(url)) {
    return buildTikTokOEmbedSourceUrl(existingId)
  }

  let current = url
  const seen = new Set<string>()

  for (let i = 0; i < 8; i++) {
    if (seen.has(current)) break
    seen.add(current)

    const id = extractTikTokVideoId(current)
    if (id) return buildTikTokOEmbedSourceUrl(id)

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

      if (response.url && response.url !== current) {
        current = response.url
        continue
      }
      break
    } catch {
      break
    }
  }

  // Automatic follow — needed when manual Location headers are missing (some serverless hosts)
  if (!extractTikTokVideoId(current)) {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 8000)
      const response = await fetch(url, {
        method: 'GET',
        redirect: 'follow',
        signal: controller.signal,
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
      })
      clearTimeout(timeoutId)
      try {
        await response.body?.cancel()
      } catch {
        // ignore
      }
      if (response.url) current = response.url
    } catch {
      // ignore
    }
  }

  const finalId = extractTikTokVideoId(current)
  if (finalId) return buildTikTokOEmbedSourceUrl(finalId)
  return current
}

/**
 * Normalize any TikTok URL into something oEmbed accepts.
 */
export async function normalizeTikTokUrlForOEmbed(url: string): Promise<string> {
  const id = extractTikTokVideoId(url)
  if (id) return buildTikTokOEmbedSourceUrl(id)
  return resolveTikTokCanonicalUrl(url)
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

    if (isTikTokShellTitle(title) && !data.thumbnail_url) {
      return null
    }

    return {
      title: isTikTokShellTitle(title) ? description : title,
      description,
      image: typeof data.thumbnail_url === 'string' ? data.thumbnail_url : null,
      author_name: typeof data.author_name === 'string' ? data.author_name : null,
      html: typeof data.html === 'string' ? data.html : null,
      canonical_url: url,
    }
  } catch (error) {
    console.debug('TikTok oEmbed error:', error)
    return null
  }
}

/**
 * Resolve short links to a video id, then oEmbed.
 */
export async function fetchTikTokMetadata(url: string): Promise<TikTokOEmbedResult | null> {
  const normalized = await normalizeTikTokUrlForOEmbed(url)
  const primary = await fetchTikTokOEmbed(normalized)
  if (primary && (primary.image || primary.title || primary.description)) {
    return primary
  }

  // Last try: original URL (rare cases where short links start working)
  if (normalized !== url) {
    const second = await fetchTikTokOEmbed(url)
    if (second && (second.image || second.title || second.description)) {
      return second
    }
  }

  return primary
}
