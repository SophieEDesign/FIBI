import { NextRequest, NextResponse } from 'next/server'
import { isUrlSafeForFetch } from '@/lib/ssrf'
import { extractOgMetaFromHtml } from '@/lib/og-meta'
import {
  fetchTikTokMetadata,
  isTikTokCanonicalVideoUrl,
  isTikTokUrl,
  resolveTikTokCanonicalUrl,
} from '@/lib/tiktok-oembed'

export const dynamic = 'force-dynamic'

interface OEmbedResponse {
  html?: string
  thumbnail_url?: string
  author_name?: string
  title?: string
  provider_name?: string
  caption_text?: string // Extracted caption text (e.g., from TikTok HTML)
  error?: string
}

function detectPlatformFromUrl(url: string): 'tiktok' | 'instagram' | 'youtube' | 'facebook' | 'generic' {
  try {
    if (isTikTokUrl(url)) return 'tiktok'
    const hostname = new URL(url).hostname.toLowerCase()
    if (hostname.includes('instagram.com')) return 'instagram'
    if (hostname.includes('youtube.com') || hostname.includes('youtu.be')) return 'youtube'
    if (hostname.includes('facebook.com') || hostname.includes('fb.com')) return 'facebook'
  } catch {
    // ignore
  }
  return 'generic'
}

/** Facebook serves OG-rich HTML to its own crawler; use that User-Agent when fetching Facebook URLs. */
const FACEBOOK_CRAWLER_UA = 'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)'
const DEFAULT_FETCH_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'

function getUserAgentForFetchUrl(url: string): string {
  try {
    const host = new URL(url).hostname.toLowerCase()
    // Meta serves OG-rich HTML to their crawler for Facebook and Instagram
    if (host.includes('facebook.com') || host.includes('fb.com') || host.includes('instagram.com')) return FACEBOOK_CRAWLER_UA
  } catch {
    // ignore
  }
  return DEFAULT_FETCH_UA
}


/** Resolve short/share URLs to canonical URL by following redirects. Same pull-through for TikTok, Instagram, YouTube, Facebook, etc. */
async function resolveCanonicalUrl(url: string, platform: 'tiktok' | 'instagram' | 'youtube' | 'facebook' | 'generic'): Promise<string> {
  if (platform === 'generic') return url
  if (platform === 'tiktok') {
    const resolved = await resolveTikTokCanonicalUrl(url)
    return isUrlSafeForFetch(resolved) ? resolved : url
  }
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 8000)
    const response = await fetch(url, {
      method: 'GET',
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        'User-Agent': DEFAULT_FETCH_UA,
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

async function fetchTikTokOEmbed(url: string): Promise<OEmbedResponse> {
  const data = await fetchTikTokMetadata(url)
  if (!data) {
    return { error: 'TikTok oEmbed failed' }
  }
  // Title and/or thumbnail are enough — TikTok HTML embeds are optional
  if (!data.html && !data.image && !data.title && !data.description) {
    return { error: 'TikTok oEmbed returned no data' }
  }
  return {
    html: data.html || undefined,
    thumbnail_url: data.image || undefined,
    author_name: data.author_name || undefined,
    title: data.title || undefined,
    provider_name: 'TikTok',
    caption_text: data.description || undefined,
  }
}

async function fetchInstagramOEmbed(url: string): Promise<OEmbedResponse> {
  try {
    // Instagram oEmbed requires Facebook Graph API access token
    const accessToken = process.env.FACEBOOK_ACCESS_TOKEN || process.env.INSTAGRAM_ACCESS_TOKEN
    
    if (!accessToken) {
      console.warn('Instagram oEmbed requires Facebook Graph API access token (FACEBOOK_ACCESS_TOKEN or INSTAGRAM_ACCESS_TOKEN)')
      // Return empty response (not an error) - will fallback to generic metadata extraction
      return {
        html: undefined,
        thumbnail_url: undefined,
        author_name: undefined,
        title: undefined,
        provider_name: undefined,
      }
    }

    // Facebook Graph API Instagram oEmbed endpoint
    // https://developers.facebook.com/docs/instagram/oembed
    const oembedUrl = `https://graph.facebook.com/v18.0/instagram_oembed?url=${encodeURIComponent(url)}&access_token=${encodeURIComponent(accessToken)}`
    
    const response = await fetch(oembedUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; FibiBot/1.0)',
      },
      next: { revalidate: 3600 }, // Cache for 1 hour
    })

    if (!response.ok) {
      // Check for specific error codes that indicate API not approved
      const errorText = await response.text().catch(() => '')
      let errorData: any = {}
      try {
        errorData = JSON.parse(errorText)
      } catch {
        // If parsing fails, use empty object
      }
      
      // Common error codes:
      // - 190: Invalid OAuth access token
      // - 10: Permission denied (app not approved)
      // - 200: Permissions error
      const isApiNotApproved = errorData.error?.code === 10 || 
                               errorData.error?.code === 200 ||
                               errorData.error?.message?.toLowerCase().includes('permission') ||
                               errorData.error?.message?.toLowerCase().includes('not approved')
      
      // Log at debug to avoid log noise; Meta oEmbed requires App Review approval
      if (isApiNotApproved) {
        console.debug('Instagram oEmbed: API not approved (Meta App Review required). Falling back to metadata.')
      } else {
        console.warn(`Instagram oEmbed failed: ${response.status}`, errorData.error?.message || errorText.substring(0, 100))
      }
      
      // Return empty response (not an error) - will fallback to generic metadata extraction
      return {
        html: undefined,
        thumbnail_url: undefined,
        author_name: undefined,
        title: undefined,
        provider_name: undefined,
      }
    }

    const data = await response.json()
    
    // Instagram oEmbed might not always return thumbnail_url
    // The LinkPreview component will fetch OG metadata as fallback
    return {
      html: data.html,
      thumbnail_url: data.thumbnail_url || undefined, // Explicitly set to undefined if not present
      author_name: data.author_name,
      title: data.title,
      provider_name: 'Instagram',
    }
  } catch (error) {
    console.error('Instagram oEmbed error:', error)
    // Return empty response (not an error) - will fallback to generic metadata extraction
    return {
      html: undefined,
      thumbnail_url: undefined,
      author_name: undefined,
      title: undefined,
      provider_name: undefined,
    }
  }
}

async function fetchYouTubeOEmbed(url: string): Promise<OEmbedResponse> {
  try {
    const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`
    const response = await fetch(oembedUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; FibiBot/1.0)',
      },
      next: { revalidate: 3600 }, // Cache for 1 hour
    })

    if (!response.ok) {
      console.warn(`YouTube oEmbed failed: ${response.status}`)
      return { error: 'YouTube oEmbed failed' }
    }

    const data = await response.json()
    return {
      html: data.html,
      thumbnail_url: data.thumbnail_url,
      author_name: data.author_name,
      title: data.title,
      provider_name: 'YouTube',
    }
  } catch (error) {
    console.error('YouTube oEmbed error:', error)
    return { error: 'YouTube oEmbed error' }
  }
}

/**
 * Process oEmbed request for a given URL
 * Shared logic for both GET and POST handlers
 */
async function processOEmbedRequest(url: string): Promise<OEmbedResponse> {
  // Validate URL format
  let parsedUrl: URL
  try {
    parsedUrl = new URL(url)
  } catch {
    return { error: 'Invalid URL format' }
  }

  // Only allow http/https
  if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
    return { error: 'Only HTTP and HTTPS URLs are allowed' }
  }

  // SSRF protection: block internal/private URLs
  if (!isUrlSafeForFetch(url)) {
    return { error: 'URL not allowed' }
  }

  const platform = detectPlatformFromUrl(url)
  let oembedData: OEmbedResponse | null = null

  // Resolve short links to canonical URL so oEmbed and metadata fetch work (TikTok vm.*, Instagram, YouTube youtu.be, etc.)
  // For TikTok, skip resolve when already a /video/ or /photo/ URL — oEmbed works directly and resolve can be slow.
  let fetchUrl = url
  if (platform === 'tiktok') {
    if (!isTikTokCanonicalVideoUrl(url)) {
      fetchUrl = await resolveCanonicalUrl(url, platform)
    }
  } else if (platform !== 'generic') {
    fetchUrl = await resolveCanonicalUrl(url, platform)
  }
  if (!isUrlSafeForFetch(fetchUrl)) {
    return { error: 'URL not allowed' }
  }

  // Try platform-specific oEmbed first (Facebook has no public oEmbed; we use generic metadata)
  switch (platform) {
    case 'tiktok':
      oembedData = await fetchTikTokOEmbed(fetchUrl)
      break
    case 'instagram':
      oembedData = await fetchInstagramOEmbed(fetchUrl)
      break
    case 'youtube':
      oembedData = await fetchYouTubeOEmbed(fetchUrl)
      break
    case 'facebook':
      oembedData = null
      break
    default:
      oembedData = null
  }

  // If platform-specific oEmbed succeeded, return it
  // Title/caption alone is enough for TikTok when CDN thumb is missing
  if (
    oembedData &&
    !oembedData.error &&
    (oembedData.html ||
      oembedData.thumbnail_url ||
      oembedData.title ||
      oembedData.caption_text)
  ) {
    return oembedData
  }

  // If platform-specific oEmbed failed or returned no data, try generic metadata extraction
  // This is especially important for Instagram/Facebook when API isn't approved yet
  {
      // For generic URLs (Facebook, Instagram, other sites), try to fetch metadata
      // This makes previews work automatically when platforms publish proper meta tags
      // When Meta/Facebook/Instagram add proper og:image tags, they'll automatically work
      // This is especially important when the API isn't approved yet
      try {
        // Fetch the URL and extract metadata directly
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 10000) // Increased timeout for slower sites
        
        const response = await fetch(fetchUrl, {
          signal: controller.signal,
          headers: {
            'User-Agent': getUserAgentForFetchUrl(fetchUrl),
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Accept-Encoding': 'gzip, deflate, br',
            'DNT': '1',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
          },
        })
        
        clearTimeout(timeoutId)
        
        if (response.ok) {
          const html = await response.text()
          const og = extractOgMetaFromHtml(html)
          let thumbnailUrl = og.image
          const title = og.title
          let description = og.description

          if (thumbnailUrl && !thumbnailUrl.startsWith('http')) {
            try {
              const baseUrl = new URL(fetchUrl)
              thumbnailUrl = new URL(thumbnailUrl, baseUrl.origin).toString()
            } catch {
              // keep original
            }
          }

          // For TikTok, Instagram, YouTube, Facebook: try JSON-LD if og:description missing
          if ((platform === 'tiktok' || platform === 'instagram' || platform === 'youtube' || platform === 'facebook') && !description) {
            try {
              const jsonLdMatches = html.match(/<script[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)
              if (jsonLdMatches) {
                for (const match of jsonLdMatches) {
                  try {
                    const jsonContent = match.replace(/<script[^>]*>|<\/script>/gi, '').trim()
                    const jsonData = JSON.parse(jsonContent)
                    if (jsonData.description) {
                      description = jsonData.description.trim()
                      break
                    }
                    if (jsonData.text) {
                      description = jsonData.text.trim()
                      break
                    }
                    if (jsonData.caption) {
                      description = jsonData.caption.trim()
                      break
                    }
                    if (jsonData['@type'] === 'VideoObject' && jsonData.description) {
                      description = jsonData.description.trim()
                      break
                    }
                    if (Array.isArray(jsonData)) {
                      for (const item of jsonData) {
                        if (item.description) {
                          description = item.description.trim()
                          break
                        }
                        if (item.text) {
                          description = item.text.trim()
                          break
                        }
                        if (item.caption) {
                          description = item.caption.trim()
                          break
                        }
                      }
                      if (description) break
                    }
                  } catch {
                    continue
                  }
                }
              }
            } catch {
              // Non-blocking
            }
          }

          const providerName =
            platform === 'tiktok' ? 'TikTok'
            : platform === 'instagram' ? 'Instagram'
            : platform === 'youtube' ? 'YouTube'
            : platform === 'facebook' ? 'Facebook'
            : 'Generic'
          return {
            html: undefined,
            thumbnail_url: thumbnailUrl || undefined,
            author_name: undefined,
            title: title || undefined,
            provider_name: providerName,
            caption_text: description || undefined,
          }
        }
      } catch (error) {
        console.debug('Generic metadata fetch failed (non-blocking):', error)
      }
      
      // If metadata fetch fails, return empty response (not an error)
      return {
        html: undefined,
        thumbnail_url: undefined,
        author_name: undefined,
        title: undefined,
        provider_name: undefined,
      }
  }
}

/**
 * GET handler - Standard oEmbed format for Meta discovery
 * Supports: ?url=...&format=json
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const url = searchParams.get('url')
    const format = searchParams.get('format') || 'json'

    if (!url || typeof url !== 'string') {
      return NextResponse.json(
        { error: 'URL parameter is required' },
        { status: 400 }
      )
    }

    // Only support JSON format (standard oEmbed)
    if (format !== 'json') {
      return NextResponse.json(
        { error: 'Only JSON format is supported' },
        { status: 400 }
      )
    }

    const oembedData = await processOEmbedRequest(url)

    // If there's an error in the response, return it gracefully
    if (oembedData.error) {
      // Return empty response (not an error) - fallback to OG metadata
      return NextResponse.json({
        html: undefined,
        thumbnail_url: undefined,
        author_name: undefined,
        title: undefined,
        provider_name: undefined,
      })
    }

    return NextResponse.json(oembedData, {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*', // Allow CORS for oEmbed discovery
      },
    })
  } catch (error: any) {
    console.error('oEmbed GET API error:', error)
    // Return empty response instead of error - fallback gracefully
    return NextResponse.json({
      html: undefined,
      thumbnail_url: undefined,
      author_name: undefined,
      title: undefined,
      provider_name: undefined,
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    })
  }
}

/**
 * POST handler - For internal app use
 */
export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json()

    if (!url || typeof url !== 'string') {
      return NextResponse.json(
        { error: 'URL is required' },
        { status: 400 }
      )
    }

    const oembedData = await processOEmbedRequest(url)

    // If there's an error in the response, return it gracefully
    if (oembedData.error) {
      // Return empty response (not an error) - fallback to OG metadata
      return NextResponse.json({
        html: undefined,
        thumbnail_url: undefined,
        author_name: undefined,
        title: undefined,
        provider_name: undefined,
      })
    }

    return NextResponse.json(oembedData)
  } catch (error: any) {
    console.error('oEmbed POST API error:', error)
    // Return empty response instead of error - fallback gracefully
    return NextResponse.json({
      html: undefined,
      thumbnail_url: undefined,
      author_name: undefined,
      title: undefined,
      provider_name: undefined,
    })
  }
}
