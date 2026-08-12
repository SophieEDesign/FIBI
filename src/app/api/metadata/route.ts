import { NextRequest, NextResponse } from 'next/server'
import { isUrlSafeForFetch } from '@/lib/ssrf'
import { extractOgMetaFromHtml } from '@/lib/og-meta'
import { fetchTikTokMetadata, isTikTokUrl } from '@/lib/tiktok-oembed'

interface MetadataResponse {
  title: string | null
  description: string | null
  image: string | null
  scrapedContent: string | null // Visible text content from the page
}

function isMetaPlatformUrl(url: string): boolean {
  try {
    const host = new URL(url).hostname.toLowerCase()
    return host.includes('facebook.com') || host.includes('fb.com') || host.includes('instagram.com')
  } catch {
    return false
  }
}

/** Resolve short URLs to canonical (same as oEmbed: TikTok, Instagram, YouTube, etc.) so OG tags are returned. */
async function resolveCanonicalUrlIfNeeded(url: string): Promise<string> {
  if (!isUrlSafeForFetch(url)) return url
  try {
    const parsed = new URL(url)
    const host = parsed.hostname.toLowerCase()
    const isShortOrRedirect =
      host.includes('tiktok.com') ||
      host.includes('instagram.com') ||
      host === 'youtu.be' ||
      host.includes('youtube.com') ||
      host.includes('facebook.com') ||
      host.includes('fb.com')
    if (!isShortOrRedirect) return url
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 8000)
    // Prefer GET — TikTok/Meta short links often ignore HEAD redirects
    const response = await fetch(url, {
      method: 'GET',
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
    })
    clearTimeout(timeoutId)
    try {
      await response.body?.cancel()
    } catch {
      // ignore
    }
    const finalUrl = response.url
    if (finalUrl && finalUrl !== url && isUrlSafeForFetch(finalUrl)) return finalUrl
  } catch (_) {
    // Ignore; use original URL
  }
  return url
}

/** Facebook/Instagram serve OG-rich HTML to their crawler. Caption and image depend on Meta serving og:description/og:image to this UA; if Meta blocks or serves a login wall, preview will be empty. */
const FACEBOOK_CRAWLER_UA = 'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)'
const DEFAULT_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

function getUserAgentForUrl(url: string): string {
  try {
    const host = new URL(url).hostname.toLowerCase()
    // Meta serves OG-rich HTML to their crawler for Facebook and Instagram
    if (host.includes('facebook.com') || host.includes('fb.com') || host.includes('instagram.com')) return FACEBOOK_CRAWLER_UA
  } catch {
    // ignore
  }
  return DEFAULT_UA
}

async function fetchWithTimeout(url: string, timeout: number = 5000): Promise<Response> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeout)
  const userAgent = getUserAgentForUrl(url)

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': userAgent,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'DNT': '1',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
      },
    })
    clearTimeout(timeoutId)
    return response
  } catch (error) {
    clearTimeout(timeoutId)
    throw error
  }
}

function extractMetadata(html: string): MetadataResponse {
  const metadata: MetadataResponse = {
    title: null,
    description: null,
    image: null,
    scrapedContent: null,
  }

  // Use shared OG extraction (handles multiple attribute orders and quote styles)
  const og = extractOgMetaFromHtml(html)
  metadata.title = og.title
  metadata.description = og.description
  metadata.image = og.image

  // Try to extract from JSON-LD structured data (TikTok, YouTube, etc. use this)
  if (!metadata.description) {
    try {
      const jsonLdMatches = html.match(/<script[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)
      if (jsonLdMatches) {
        for (const match of jsonLdMatches) {
          try {
            const jsonContent = match.replace(/<script[^>]*>|<\/script>/gi, '').trim()
            const jsonData = JSON.parse(jsonContent)
            
            // Check for description in various JSON-LD structures
            if (jsonData.description) {
              metadata.description = jsonData.description.trim()
              break
            }
            if (jsonData.text) {
              metadata.description = jsonData.text.trim()
              break
            }
            if (jsonData.caption) {
              metadata.description = jsonData.caption.trim()
              break
            }
            // For VideoObject schema
            if (jsonData['@type'] === 'VideoObject' && jsonData.description) {
              metadata.description = jsonData.description.trim()
              break
            }
            // For array of objects
            if (Array.isArray(jsonData)) {
              for (const item of jsonData) {
                if (item.description) {
                  metadata.description = item.description.trim()
                  break
                }
                if (item.text) {
                  metadata.description = item.text.trim()
                  break
                }
                if (item.caption) {
                  metadata.description = item.caption.trim()
                  break
                }
              }
              if (metadata.description) break
            }
          } catch (parseError) {
            // Skip invalid JSON, continue to next script tag
            continue
          }
        }
      }
    } catch (err) {
      // Silently fail - JSON-LD extraction is optional
      console.debug('Error extracting JSON-LD:', err)
    }
  }

  // Extract visible text content from the page (for AI enrichment)
  try {
    // Remove script and style tags
    let cleanHtml = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    cleanHtml = cleanHtml.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    
    // Extract text from common content containers
    const contentSelectors = [
      /<main[^>]*>([\s\S]*?)<\/main>/i,
      /<article[^>]*>([\s\S]*?)<\/article>/i,
      /<div[^>]*class=["'][^"']*content[^"']*["'][^>]*>([\s\S]*?)<\/div>/i,
      /<div[^>]*id=["'][^"']*content[^"']*["'][^>]*>([\s\S]*?)<\/div>/i,
      /<body[^>]*>([\s\S]*?)<\/body>/i,
    ]
    
    let extractedText = ''
    for (const selector of contentSelectors) {
      const match = cleanHtml.match(selector)
      if (match && match[1]) {
        extractedText = match[1]
        break
      }
    }
    
    // If no specific container found, use body content
    if (!extractedText) {
      const bodyMatch = cleanHtml.match(/<body[^>]*>([\s\S]*?)<\/body>/i)
      if (bodyMatch) {
        extractedText = bodyMatch[1]
      } else {
        extractedText = cleanHtml
      }
    }
    
    // Remove HTML tags and decode entities
    let text = extractedText
      .replace(/<[^>]+>/g, ' ') // Remove HTML tags
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim()
    
    // Limit to 2000 characters to avoid token limits
    if (text.length > 2000) {
      text = text.substring(0, 2000) + '...'
    }
    
    // Only include if we have meaningful content (more than just whitespace and short)
    if (text.length > 50) {
      metadata.scrapedContent = text
      
      // If we don't have a description from OG tags, use scraped content as description
      // (but limit it to a reasonable length for the description field)
      if (!metadata.description && text.length > 0) {
        // Use first 500 characters of scraped content as description
        metadata.description = text.substring(0, 500).trim()
        if (text.length > 500) {
          metadata.description += '...'
        }
      }
    }
  } catch (err) {
    // Silently fail - scraping is optional
    console.debug('Error extracting page content:', err)
  }

  return metadata
}

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json()

    if (!url || typeof url !== 'string') {
      return NextResponse.json(
        { error: 'URL is required' },
        { status: 400 }
      )
    }

    // Validate URL format
    let parsedUrl: URL
    try {
      parsedUrl = new URL(url)
    } catch {
      return NextResponse.json(
        { error: 'Invalid URL format' },
        { status: 400 }
      )
    }

    // Only allow http/https
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      return NextResponse.json(
        { error: 'Only HTTP and HTTPS URLs are allowed' },
        { status: 400 }
      )
    }

    // SSRF protection: block internal/private URLs
    if (!isUrlSafeForFetch(url)) {
      return NextResponse.json({
        title: null,
        description: null,
        image: null,
        scrapedContent: null,
      })
    }

    try {
      // TikTok stopped serving og:* to scrapers (shell page only). Use oEmbed for title/thumb.
      // Short links (vm./vt./t/) must be resolved to a video id first — handled inside fetchTikTokMetadata.
      if (isTikTokUrl(url)) {
        const tiktok = await fetchTikTokMetadata(url)
        if (tiktok && (tiktok.title || tiktok.description || tiktok.image)) {
          return NextResponse.json({
            title: tiktok.title,
            description: tiktok.description,
            image: tiktok.image,
            scrapedContent: tiktok.description,
          } satisfies MetadataResponse)
        }
        // Do not fall through to HTML scrape for TikTok — it only returns "Make Your Day"
        return NextResponse.json({
          title: null,
          description: null,
          image: null,
          scrapedContent: null,
        } satisfies MetadataResponse)
      }

      const fetchUrl = await resolveCanonicalUrlIfNeeded(url)
      if (!isUrlSafeForFetch(fetchUrl)) {
        return NextResponse.json({
          title: null,
          description: null,
          image: null,
          scrapedContent: null,
        })
      }

      const isMeta = isMetaPlatformUrl(fetchUrl)
      let response = await fetchWithTimeout(fetchUrl, 8000)
      let html = response.ok ? await response.text() : ''

      // For Meta (Facebook/Instagram): retry once if fetch failed or OG tags missing (reduces "works then not" from transient blocks)
      if (isMeta && (!response.ok || (!html.includes('og:image') && !html.includes('og:title')))) {
        await new Promise(r => setTimeout(r, 500))
        response = await fetchWithTimeout(fetchUrl, 8000)
        if (response.ok) html = await response.text()
      }

      if (!response.ok) {
        return NextResponse.json({
          title: null,
          description: null,
          image: null,
          scrapedContent: null,
        })
      }

      const metadata = extractMetadata(html)

      if (process.env.NODE_ENV === 'development') {
        console.log('Metadata extraction result:', {
          url,
          hasTitle: !!metadata.title,
          hasDescription: !!metadata.description,
          hasImage: !!metadata.image,
          hasScrapedContent: !!metadata.scrapedContent,
        })
      }

      return NextResponse.json(metadata)
    } catch (error: any) {
      // If fetch fails, return empty metadata (best effort)
      console.error('Metadata fetch error:', error.message)
      return NextResponse.json({
        title: null,
        description: null,
        image: null,
        scrapedContent: null,
      })
    }
  } catch (error: any) {
    console.error('Metadata API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

