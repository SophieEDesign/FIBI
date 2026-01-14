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

async function fetchTikTokOEmbed(url: string): Promise<OEmbedResponse> {
  try {
    const oembedUrl = `https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`
    const response = await fetch(oembedUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; FibiBot/1.0)',
      },
      next: { revalidate: 3600 }, // Cache for 1 hour
    })

    if (!response.ok) {
      console.warn(`TikTok oEmbed failed: ${response.status}`)
      return { error: 'TikTok oEmbed failed' }
    }

    const data = await response.json()
    
    // Extract caption from TikTok HTML (WordPress-style extraction)
    // TikTok oEmbed HTML contains the caption in a <p> tag within a blockquote
    let captionText: string | undefined
    if (data.html) {
      // Try to extract caption from <p> tag in the blockquote HTML
      // Pattern: <blockquote><p>caption text</p></blockquote>
      const captionMatch = data.html.match(/<blockquote[^>]*>\s*<p[^>]*>([^<]+)<\/p>/i) ||
                                          data.html.match(/<p[^>]*class\s*=\s*["'][^"']*caption[^"']*["'][^>]*>([^<]+)<\/p>/i) ||
                                          data.html.match(/<p[^>]*>([^<]{10,})<\/p>/i) // Fallback: any <p> with substantial text
      
      if (captionMatch && captionMatch[1]) {
        let extractedText = captionMatch[1].trim()
        // Clean up HTML entities
        extractedText = extractedText
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&quot;/g, '"')
          .replace(/&#39;/g, "'")
          .replace(/&nbsp;/g, ' ')
        captionText = extractedText
      }
    }
    
    return {
      html: data.html,
      thumbnail_url: data.thumbnail_url,
      author_name: data.author_name,
      title: data.title,
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
      return { error: 'Instagram oEmbed requires authentication' }
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
      console.warn(`Instagram oEmbed failed: ${response.status}`)
      return { error: 'Instagram oEmbed failed' }
    }

    const data = await response.json()
    return {
      html: data.html,
      thumbnail_url: data.thumbnail_url,
      author_name: data.author_name,
      title: data.title,
      provider_name: 'Instagram',
    }
  } catch (error) {
    console.error('Instagram oEmbed error:', error)
    return { error: 'Instagram oEmbed error' }
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
  let oembedData: OEmbedResponse

  switch (platform) {
    case 'tiktok':
      oembedData = await fetchTikTokOEmbed(url)
      break
    case 'instagram':
      oembedData = await fetchInstagramOEmbed(url)
      break
    case 'youtube':
      oembedData = await fetchYouTubeOEmbed(url)
      break
    default:
      // For generic URLs (Facebook, Instagram, other sites), try to fetch metadata
      // This makes previews work automatically when platforms publish proper meta tags
      // When Meta/Facebook/Instagram add proper og:image tags, they'll automatically work
      try {
        // Fetch the URL and extract metadata directly
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 8000)
        
        const response = await fetch(url, {
          signal: controller.signal,
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; FibiBot/1.0)',
          },
        })
        
        clearTimeout(timeoutId)
        
        if (response.ok) {
          const html = await response.text()
          
          // Extract metadata using same logic as metadata API
          let thumbnailUrl: string | null = null
          let title: string | null = null
          let description: string | null = null
          
          // Extract og:image
          const ogImageMatch = html.match(/<meta[^>]*property\s*=\s*["']og:image["'][^>]*content\s*=\s*["']([^"']+)["']/i) ||
                                 html.match(/<meta[^>]*content\s*=\s*["']([^"']+)["'][^>]*property\s*=\s*["']og:image["']/i)
          if (ogImageMatch) {
            thumbnailUrl = ogImageMatch[1].trim()
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
          
          // Return metadata in oEmbed format for consistency
          return {
            html: undefined, // No HTML embed for generic URLs
            thumbnail_url: thumbnailUrl || undefined,
            author_name: undefined,
            title: title || undefined,
            provider_name: 'Generic',
            // Include description as caption_text for consistency
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

  if (oembedData.error) {
    // Return empty response (not an error) - fallback to OG metadata
    return {
      html: undefined,
      thumbnail_url: undefined,
      author_name: undefined,
      title: undefined,
      provider_name: undefined,
    }
  }

  return oembedData
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
