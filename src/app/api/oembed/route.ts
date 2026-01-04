import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

interface OEmbedResponse {
  html?: string
  thumbnail_url?: string
  author_name?: string
  title?: string
  provider_name?: string
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
    return {
      html: data.html,
      thumbnail_url: data.thumbnail_url,
      author_name: data.author_name,
      title: data.title,
      provider_name: 'TikTok',
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
        return NextResponse.json(
          { error: 'Platform not supported for oEmbed' },
          { status: 400 }
        )
    }

    if (oembedData.error) {
      // Return empty response (not an error) - fallback to OG metadata
      return NextResponse.json({
        html: null,
        thumbnail_url: null,
        author_name: null,
        title: null,
        provider_name: null,
      })
    }

    return NextResponse.json(oembedData)
  } catch (error: any) {
    console.error('oEmbed API error:', error)
    // Return empty response instead of error - fallback gracefully
    return NextResponse.json({
      html: null,
      thumbnail_url: null,
      author_name: null,
      title: null,
      provider_name: null,
    })
  }
}
