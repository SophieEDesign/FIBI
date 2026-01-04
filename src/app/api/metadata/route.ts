import { NextRequest, NextResponse } from 'next/server'

interface MetadataResponse {
  title: string | null
  description: string | null
  image: string | null
  scrapedContent: string | null // Visible text content from the page
}

async function fetchWithTimeout(url: string, timeout: number = 5000): Promise<Response> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeout)

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; FibiBot/1.0)',
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

  // Extract Open Graph tags
  const ogTitleMatch = html.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i)
  if (ogTitleMatch) {
    metadata.title = ogTitleMatch[1].trim()
  }

  const ogDescriptionMatch = html.match(/<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']+)["']/i)
  if (ogDescriptionMatch) {
    metadata.description = ogDescriptionMatch[1].trim()
  }

  const ogImageMatch = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i)
  if (ogImageMatch) {
    metadata.image = ogImageMatch[1].trim()
  }

  // Fallback to Twitter image if no og:image
  if (!metadata.image) {
    const twitterImageMatch = html.match(/<meta[^>]*name=["']twitter:image["'][^>]*content=["']([^"']+)["']/i)
    if (twitterImageMatch) {
      metadata.image = twitterImageMatch[1].trim()
    }
  }

  // Fallback to meta description if no og:description
  if (!metadata.description) {
    const metaDescriptionMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i)
    if (metaDescriptionMatch) {
      metadata.description = metaDescriptionMatch[1].trim()
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
      const response = await fetchWithTimeout(url, 8000)
      
      if (!response.ok) {
        return NextResponse.json({
          title: null,
          description: null,
          image: null,
          scrapedContent: null,
        })
      }

      const html = await response.text()
      const metadata = extractMetadata(html)

      console.log('Metadata extraction result:', {
        url,
        hasTitle: !!metadata.title,
        hasDescription: !!metadata.description,
        hasImage: !!metadata.image,
        hasScrapedContent: !!metadata.scrapedContent,
        descriptionLength: metadata.description?.length || 0,
        imageUrl: metadata.image?.substring(0, 100) || null,
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

