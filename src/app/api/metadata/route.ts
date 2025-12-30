import { NextRequest, NextResponse } from 'next/server'

interface MetadataResponse {
  title: string | null
  description: string | null
  image: string | null
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

  // Fallback to meta description if no og:description
  if (!metadata.description) {
    const metaDescriptionMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i)
    if (metaDescriptionMatch) {
      metadata.description = metaDescriptionMatch[1].trim()
    }
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
        })
      }

      const html = await response.text()
      const metadata = extractMetadata(html)

      return NextResponse.json(metadata)
    } catch (error: any) {
      // If fetch fails, return empty metadata (best effort)
      console.error('Metadata fetch error:', error.message)
      return NextResponse.json({
        title: null,
        description: null,
        image: null,
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

