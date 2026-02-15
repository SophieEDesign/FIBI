import { NextRequest, NextResponse } from 'next/server'

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

function detectPlatformFromUrl(url: string): 'tiktok' | 'instagram' | 'youtube' | 'generic' {
  const hostname = new URL(url).hostname.toLowerCase()
  
  if (hostname.includes('tiktok.com')) return 'tiktok'
  if (hostname.includes('instagram.com')) return 'instagram'
  if (hostname.includes('youtube.com') || hostname.includes('youtu.be')) return 'youtube'
  return 'generic'
}

/** Resolve short URLs to canonical URL by following redirects. Same pull-through for TikTok, Instagram, YouTube, etc. */
async function resolveCanonicalUrl(url: string, platform: 'tiktok' | 'instagram' | 'youtube' | 'generic'): Promise<string> {
  if (platform === 'generic') return url
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 8000)
    const response = await fetch(url, {
      method: 'HEAD',
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    })
    clearTimeout(timeoutId)
    const finalUrl = response.url
    if (finalUrl && finalUrl !== url) return finalUrl
  } catch (_) {
    // Ignore; use original URL
  }
  return url
}

async function fetchTikTokOEmbed(url: string): Promise<OEmbedResponse> {
  try {
    const oembedUrl = `https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`
    const response = await fetch(oembedUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/html, */*',
        'Accept-Language': 'en-US,en;q=0.9',
        'Referer': 'https://www.tiktok.com/',
        'Origin': 'https://www.tiktok.com',
      },
      next: { revalidate: 3600 }, // Cache for 1 hour
    })

    if (!response.ok) {
      const errorText = await response.text().catch(() => '')
      console.warn(`TikTok oEmbed failed: ${response.status} ${response.statusText}`, errorText.substring(0, 200))
      return { error: 'TikTok oEmbed failed' }
    }

    const data = await response.json()
    
    if (data.error) {
      console.warn('TikTok oEmbed returned error:', data)
      return { error: 'TikTok oEmbed returned no data' }
    }
    // Accept partial responses: title and/or thumbnail_url are still useful even without html
    
    // Extract caption from TikTok HTML (WordPress-style extraction)
    // TikTok oEmbed HTML contains the caption in a <p> tag within a blockquote
    let captionText: string | undefined
    
    // Helper function to decode HTML entities
    const decodeHtmlEntities = (text: string): string => {
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
    
    if (data.html) {
      // Try multiple patterns to extract caption from HTML
      // Pattern 1: <blockquote><p>caption text</p></blockquote>
      // Pattern 2: <p> inside blockquote with various attributes
      // Pattern 3: Any <p> tag with substantial text (10+ chars)
      // Pattern 4: Text content directly in blockquote
      let captionMatch = data.html.match(/<blockquote[^>]*>\s*<p[^>]*>([^<]+)<\/p>/i) ||
                          data.html.match(/<blockquote[^>]*>\s*<p[^>]*>([\s\S]*?)<\/p>/i) ||
                          data.html.match(/<p[^>]*class\s*=\s*["'][^"']*caption[^"']*["'][^>]*>([^<]+)<\/p>/i) ||
                          data.html.match(/<p[^>]*>([^<]{10,})<\/p>/i) ||
                          data.html.match(/<blockquote[^>]*>([^<]+)<\/blockquote>/i)
      
      if (captionMatch && captionMatch[1]) {
        let extractedText = captionMatch[1].trim()
        // Remove any remaining HTML tags
        extractedText = extractedText.replace(/<[^>]*>/g, '')
        // Decode HTML entities
        extractedText = decodeHtmlEntities(extractedText)
        // Clean up whitespace
        extractedText = extractedText.replace(/\s+/g, ' ').trim()
        
        if (extractedText.length > 0) {
          captionText = extractedText
        }
      }
    }
    
    // Fallback: TikTok's title field often contains the caption text
    // Use it if HTML extraction failed or returned empty
    if (!captionText && data.title) {
      let titleText = data.title.trim()
      // Remove common TikTok prefixes like "TikTok - " or "@username - "
      titleText = titleText.replace(/^TikTok\s*[-–—]\s*/i, '')
      titleText = titleText.replace(/^@[\w.-]+\s*[-–—]\s*/i, '')
      titleText = decodeHtmlEntities(titleText)
      
      if (titleText.length > 0) {
        captionText = titleText
      }
    }
    
    return {
      html: data.html || undefined,
      thumbnail_url: data.thumbnail_url || undefined,
      author_name: data.author_name || undefined,
      title: data.title || undefined,
      provider_name: 'TikTok',
      caption_text: captionText,
    }
  } catch (error) {
    console.error('TikTok oEmbed error:', error)
    return { error: 'TikTok oEmbed error' }
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
      
      if (isApiNotApproved) {
        console.warn(`Instagram oEmbed API not approved or permission denied: ${response.status}`, errorData.error)
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

  const platform = detectPlatformFromUrl(url)
  let oembedData: OEmbedResponse | null = null

  // Resolve short links to canonical URL so oEmbed and metadata fetch work (TikTok vm.*, Instagram, YouTube youtu.be, etc.)
  let fetchUrl = url
  if (platform !== 'generic') {
    fetchUrl = await resolveCanonicalUrl(url, platform)
  }

  // Try platform-specific oEmbed first
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
    default:
      oembedData = null
  }

  // If platform-specific oEmbed succeeded, return it
  if (oembedData && !oembedData.error && (oembedData.html || oembedData.thumbnail_url)) {
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
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
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
          
          // Extract metadata using same logic as metadata API
          let thumbnailUrl: string | null = null
          let title: string | null = null
          let description: string | null = null
          
          // Extract og:image (try multiple patterns)
          const ogImageMatch = html.match(/<meta[^>]*property\s*=\s*["']og:image["'][^>]*content\s*=\s*["']([^"']+)["']/i) ||
                                 html.match(/<meta[^>]*content\s*=\s*["']([^"']+)["'][^>]*property\s*=\s*["']og:image["']/i) ||
                                 html.match(/<meta[^>]*property\s*=\s*["']og:image:secure_url["'][^>]*content\s*=\s*["']([^"']+)["']/i) ||
                                 html.match(/<meta[^>]*content\s*=\s*["']([^"']+)["'][^>]*property\s*=\s*["']og:image:secure_url["']/i)
          if (ogImageMatch) {
            thumbnailUrl = ogImageMatch[1].trim()
            // Handle relative URLs
            if (thumbnailUrl && !thumbnailUrl.startsWith('http')) {
              try {
                const baseUrl = new URL(fetchUrl)
                thumbnailUrl = new URL(thumbnailUrl, baseUrl.origin).toString()
              } catch {
                // If URL construction fails, use original
              }
            }
          }
          
          // Extract og:title
          const ogTitleMatch = html.match(/<meta[^>]*property\s*=\s*["']og:title["'][^>]*content\s*=\s*["']([^"']+)["']/i) ||
                              html.match(/<meta[^>]*content\s*=\s*["']([^"']+)["'][^>]*property\s*=\s*["']og:title["']/i)
          if (ogTitleMatch) {
            title = ogTitleMatch[1].trim()
          }
          
          // Extract og:description
          const ogDescriptionMatch = html.match(/<meta[^>]*property\s*=\s*["']og:description["'][^>]*content\s*=\s*["']([^"']+)["']/i) ||
                                     html.match(/<meta[^>]*content\s*=\s*["']([^"']+)["'][^>]*property\s*=\s*["']og:description["']/i)
          if (ogDescriptionMatch) {
            description = ogDescriptionMatch[1].trim()
          }
          
          // For TikTok, Instagram, YouTube: try JSON-LD / structured data if og:description missing
          if ((platform === 'tiktok' || platform === 'instagram' || platform === 'youtube') && !description) {
            try {
              const jsonLdMatches = html.match(/<script[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)
              if (jsonLdMatches) {
                for (const match of jsonLdMatches) {
                  try {
                    const jsonContent = match.replace(/<script[^>]*>|<\/script>/gi, '').trim()
                    const jsonData = JSON.parse(jsonContent)
                    
                    // Check for description in various JSON-LD structures
                    if (jsonData.description && !description) {
                      description = jsonData.description.trim()
                    }
                    if (jsonData.text && !description) {
                      description = jsonData.text.trim()
                    }
                    if (jsonData.caption && !description) {
                      description = jsonData.caption.trim()
                    }
                    // For VideoObject schema
                    if (jsonData['@type'] === 'VideoObject' && jsonData.description && !description) {
                      description = jsonData.description.trim()
                    }
                    // For array of objects
                    if (Array.isArray(jsonData)) {
                      for (const item of jsonData) {
                        if (item.description && !description) {
                          description = item.description.trim()
                          break
                        }
                        if (item.text && !description) {
                          description = item.text.trim()
                          break
                        }
                        if (item.caption && !description) {
                          description = item.caption.trim()
                          break
                        }
                      }
                    }
                    if (description) break
                  } catch (parseError) {
                    // Skip invalid JSON, continue to next script tag
                    continue
                  }
                }
              }
            } catch (error) {
              // Non-blocking - continue
            }
          }
          
          const providerName =
            platform === 'tiktok' ? 'TikTok'
            : platform === 'instagram' ? 'Instagram'
            : platform === 'youtube' ? 'YouTube'
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
