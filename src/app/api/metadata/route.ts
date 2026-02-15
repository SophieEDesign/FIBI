import { NextRequest, NextResponse } from 'next/server'

interface MetadataResponse {
  title: string | null
  description: string | null
  image: string | null
  scrapedContent: string | null // Visible text content from the page
}

/** Resolve short URLs to canonical (same as oEmbed: TikTok, Instagram, YouTube, etc.) so OG tags are returned. */
async function resolveCanonicalUrlIfNeeded(url: string): Promise<string> {
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

async function fetchWithTimeout(url: string, timeout: number = 5000): Promise<Response> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeout)

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
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

  // Extract title
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i)
  if (titleMatch) {
    metadata.title = titleMatch[1].trim()
  }

  // Extract Open Graph tags - handle both single and double quotes, and different attribute orders
  const ogTitleMatch = html.match(/<meta[^>]*property\s*=\s*["']og:title["'][^>]*content\s*=\s*["']([^"']+)["']/i) || 
                       html.match(/<meta[^>]*content\s*=\s*["']([^"']+)["'][^>]*property\s*=\s*["']og:title["']/i)
  if (ogTitleMatch) {
    metadata.title = ogTitleMatch[1].trim()
  }

  const ogDescriptionMatch = html.match(/<meta[^>]*property\s*=\s*["']og:description["'][^>]*content\s*=\s*["']([^"']+)["']/i) ||
                             html.match(/<meta[^>]*content\s*=\s*["']([^"']+)["'][^>]*property\s*=\s*["']og:description["']/i)
  if (ogDescriptionMatch) {
    metadata.description = ogDescriptionMatch[1].trim()
  }

  const ogImageMatch = html.match(/<meta[^>]*property\s*=\s*["']og:image["'][^>]*content\s*=\s*["']([^"']+)["']/i) ||
                      html.match(/<meta[^>]*content\s*=\s*["']([^"']+)["'][^>]*property\s*=\s*["']og:image["']/i)
  if (ogImageMatch) {
    metadata.image = ogImageMatch[1].trim()
  }

  // Fallback to Twitter image if no og:image
  if (!metadata.image) {
    const twitterImageMatch = html.match(/<meta[^>]*name\s*=\s*["']twitter:image["'][^>]*content\s*=\s*["']([^"']+)["']/i) ||
                              html.match(/<meta[^>]*content\s*=\s*["']([^"']+)["'][^>]*name\s*=\s*["']twitter:image["']/i) ||
                              html.match(/<meta[^>]*property\s*=\s*["']twitter:image["'][^>]*content\s*=\s*["']([^"']+)["']/i) ||
                              html.match(/<meta[^>]*content\s*=\s*["']([^"']+)["'][^>]*property\s*=\s*["']twitter:image["']/i)
    if (twitterImageMatch) {
      metadata.image = twitterImageMatch[1].trim()
    }
  }

  // Fallback to meta description if no og:description
  if (!metadata.description) {
    const metaDescriptionMatch = html.match(/<meta[^>]*name\s*=\s*["']description["'][^>]*content\s*=\s*["']([^"']+)["']/i) ||
                                 html.match(/<meta[^>]*content\s*=\s*["']([^"']+)["'][^>]*name\s*=\s*["']description["']/i)
    if (metaDescriptionMatch) {
      metadata.description = metaDescriptionMatch[1].trim()
    }
  }

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

    try {
      const fetchUrl = await resolveCanonicalUrlIfNeeded(url)
      const response = await fetchWithTimeout(fetchUrl, 8000)
      
      if (!response.ok) {
        return NextResponse.json({
          title: null,
          description: null,
          image: null,
          scrapedContent: null,
        })
      }

      const html = await response.text()
      
      // Debug: Check if HTML contains OG tags
      const hasOGDescription = /og:description/i.test(html)
      const hasOGImage = /og:image/i.test(html)
      const hasMetaDescription = /<meta[^>]*name\s*=\s*["']description["']/i.test(html)
      const htmlLength = html.length
      
      console.log('Metadata extraction - HTML analysis:', {
        url,
        htmlLength,
        hasOGDescription,
        hasOGImage,
        hasMetaDescription,
        first500Chars: html.substring(0, 500),
      })
      
      const metadata = extractMetadata(html)

      console.log('Metadata extraction result:', {
        url,
        hasTitle: !!metadata.title,
        title: metadata.title?.substring(0, 100) || null,
        hasDescription: !!metadata.description,
        description: metadata.description?.substring(0, 200) || null,
        descriptionLength: metadata.description?.length || 0,
        hasImage: !!metadata.image,
        imageUrl: metadata.image?.substring(0, 100) || null,
        hasScrapedContent: !!metadata.scrapedContent,
        scrapedContentLength: metadata.scrapedContent?.length || 0,
      })

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

