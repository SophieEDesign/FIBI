import { NextRequest, NextResponse } from 'next/server'
import { isUrlSafeForFetch } from '@/lib/ssrf'

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
      'tiktokcdn.com',
      'tiktok.com',
    ]
    
    const hostname = parsedUrl.hostname.toLowerCase()
    const isAllowedHost = allowedHosts.some(allowed => hostname.includes(allowed))

    if (!isAllowedHost) {
      // For other hosts, redirect only if URL is safe (no open redirect to internal/hostile hosts)
      if (!isUrlSafeForFetch(imageUrl)) {
        return NextResponse.json(
          { error: 'URL not allowed' },
          { status: 400 }
        )
      }
      return NextResponse.redirect(imageUrl, { status: 302 })
    }

    try {
      // Use site-origin Referer for FB/IG CDNs (they often block wrong or missing Referer)
      let referer = `${parsedUrl.origin}/`
      if (hostname.includes('cdninstagram.com') || hostname.includes('instagram.com')) {
        referer = 'https://www.instagram.com/'
      } else if (hostname.includes('fbcdn.net') || hostname.includes('facebook.com')) {
        referer = 'https://www.facebook.com/'
      }

      // Fetch with browser-like headers; some CDNs block non-browser or data-center requests
      const response = await fetch(imageUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
          'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
          'Referer': referer,
          'Origin': referer.replace(/\/$/, ''),
          'Sec-Fetch-Dest': 'image',
          'Sec-Fetch-Mode': 'cors',
        },
        next: { revalidate: 3600 }, // Cache for 1 hour
      })

      if (!response.ok) {
        // Log at debug level to avoid flooding logs; FB/IG CDNs often block server-side fetches (403)
        if (response.status === 403) {
          console.debug(`Image proxy 403 (CDN blocks server fetch): ${hostname}`)
        } else {
          console.warn(`Image proxy failed: ${response.status} for ${imageUrl}`)
        }
        // Return 404 so the client's img onError runs and can try raw URL or show placeholder.
        return new NextResponse(null, { status: 404 })
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
      // For FB/IG CDNs, do not redirect (avoids browser 403). Return 404 so placeholder shows.
      return new NextResponse(null, { status: 404 })
    }
  } catch (error: any) {
    console.error('Image proxy API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

