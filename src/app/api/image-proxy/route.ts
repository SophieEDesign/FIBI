import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * Image proxy endpoint to handle 403 errors from Facebook/Instagram CDN
 * This endpoint fetches images server-side and serves them to avoid CORS/referrer issues
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const imageUrl = searchParams.get('url')

    if (!imageUrl || typeof imageUrl !== 'string') {
      return NextResponse.json(
        { error: 'URL parameter is required' },
        { status: 400 }
      )
    }

    // Validate URL format
    let parsedUrl: URL
    try {
      parsedUrl = new URL(imageUrl)
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

    // Only proxy images from known CDNs that block direct access
    const allowedHosts = [
      'fbcdn.net',
      'cdninstagram.com',
      'instagram.com',
      'facebook.com',
    ]
    
    const hostname = parsedUrl.hostname.toLowerCase()
    const isAllowedHost = allowedHosts.some(allowed => hostname.includes(allowed))
    
    if (!isAllowedHost) {
      // For other hosts, redirect to the original URL
      return NextResponse.redirect(imageUrl, { status: 302 })
    }

    try {
      // Fetch the image with proper headers to avoid blocking
      const response = await fetch(imageUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; FibiBot/1.0)',
          'Referer': parsedUrl.origin,
          'Accept': 'image/*',
        },
        next: { revalidate: 3600 }, // Cache for 1 hour
      })

      if (!response.ok) {
        console.warn(`Image proxy failed: ${response.status} for ${imageUrl}`)
        // If proxy fails, redirect to original URL anyway
        return NextResponse.redirect(imageUrl, { status: 302 })
      }

      // Get the image data
      const imageBuffer = await response.arrayBuffer()
      const contentType = response.headers.get('content-type') || 'image/jpeg'

      // Return the image with appropriate headers
      return new NextResponse(imageBuffer, {
        status: 200,
        headers: {
          'Content-Type': contentType,
          'Cache-Control': 'public, max-age=3600, must-revalidate',
          'Access-Control-Allow-Origin': '*',
        },
      })
    } catch (error) {
      console.error('Image proxy error:', error)
      // If proxy fails, redirect to original URL
      return NextResponse.redirect(imageUrl, { status: 302 })
    }
  } catch (error: any) {
    console.error('Image proxy API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

