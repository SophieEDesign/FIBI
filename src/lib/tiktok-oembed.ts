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

/**
 * Pull a video or photo id out of a redirect, share URL, or TikTok HTML shell.
 * Short links often hide the id in the Location header or in the small HTML body.
 */
export function extractTikTokIdFromText(text: string | null | undefined): string | null {
  if (!text) return null
  const decoded = text
    .replace(/&amp;/g, '&')
    .replace(/\\u0026/gi, '&')
    .replace(/\\u002F/gi, '/')
    .replace(/\\u003D/gi, '=')
    .replace(/\\\//g, '/')

  const path = decoded.match(/\/(?:video|photo)\/(\d{8,})/)
  if (path?.[1]) return path[1]
  const share = decoded.match(/share_item_id=(\d{8,})/)
  if (share?.[1]) return share[1]
  return null
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

const TIKTOK_FETCH_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
}

async function readTikTokIdFromResponse(
  response: Response,
  baseUrl: string
): Promise<string | null> {
  const location = response.headers.get('location')
  if (location) {
    const fromHeader =
      extractTikTokIdFromText(location) ||
      extractTikTokVideoId(new URL(location, baseUrl).toString())
    if (fromHeader) {
      try {
        await response.body?.cancel()
      } catch {
        // ignore
      }
      return fromHeader
    }
  }

  if (response.url) {
    const fromFinal = extractTikTokVideoId(response.url)
    if (fromFinal) {
      try {
        await response.body?.cancel()
      } catch {
        // ignore
      }
      return fromFinal
    }
  }

  // Short-link responses are a tiny HTML redirect. The video page shell also
  // embeds the id even when og:image is missing. Read both.
  const text = await response.text()
  return extractTikTokIdFromText(text.slice(0, 500_000))
}

async function probeTikTokUrl(
  url: string,
  redirect: 'manual' | 'follow'
): Promise<string | null> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 8000)
  try {
    const response = await fetch(url, {
      method: 'GET',
      redirect,
      signal: controller.signal,
      cache: 'no-store',
      headers: TIKTOK_FETCH_HEADERS,
    })
    return await readTikTokIdFromResponse(response, url)
  } catch {
    return null
  } finally {
    clearTimeout(timeoutId)
  }
}

/**
 * Follow short-link redirects to an oEmbed-friendly `/@/video/{id}` URL.
 * Reads the response body because some hosts hide the Location header.
 */
export async function resolveTikTokCanonicalUrl(url: string): Promise<string> {
  const existingId = extractTikTokVideoId(url)
  if (existingId && !isTikTokShortLink(url)) {
    return buildTikTokOEmbedSourceUrl(existingId)
  }

  const manualId = await probeTikTokUrl(url, 'manual')
  if (manualId) return buildTikTokOEmbedSourceUrl(manualId)

  const followedId = await probeTikTokUrl(url, 'follow')
  if (followedId) return buildTikTokOEmbedSourceUrl(followedId)

  return url
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
