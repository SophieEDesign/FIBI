'use client'

import { useState, useEffect } from 'react'
import { detectPlatform } from '@/lib/utils'

interface EmbedPreviewProps {
  url: string
  thumbnailUrl: string | null
  platform: string
  displayTitle: string
  onImageLoad?: () => void
}

interface OEmbedData {
  thumbnail_url?: string | null
}

/**
 * EmbedPreview Component
 * 
 * Fetches oEmbed thumbnail for platforms (TikTok, Instagram, YouTube)
 * when no screenshot is available. Falls back to OG thumbnail if oEmbed fails.
 */
export default function EmbedPreview({ 
  url, 
  thumbnailUrl, 
  platform, 
  displayTitle,
  onImageLoad 
}: EmbedPreviewProps) {
  const [oembedThumbnail, setOembedThumbnail] = useState<string | null>(null)
  const [fetchedOgImage, setFetchedOgImage] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [imageError, setImageError] = useState(false)

  const isTikTok = platform === 'TikTok'
  const isInstagram = platform === 'Instagram'
  const isYouTube = platform === 'YouTube'

  // Fetch metadata to get OG image - always try if thumbnailUrl is not provided
  // This ensures we get preview images even when thumbnail_url wasn't saved
  useEffect(() => {
    if (!url.trim()) return
    
    // If we already have thumbnailUrl prop, don't fetch (it's already provided)
    if (thumbnailUrl) return
    
    // Always fetch metadata to get OG image, even if oEmbed data exists
    // oEmbed might have HTML but no thumbnail, or might not work for all platforms
    const fetchMetadata = async () => {
      try {
        const response = await fetch('/api/metadata', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url }),
        })
        
        if (response.ok) {
          const data = await response.json()
          if (data.image) {
            console.log('EmbedPreview: Fetched OG image from metadata API', { image: data.image.substring(0, 100) })
            setFetchedOgImage(data.image)
          }
        }
      } catch (error) {
        console.debug('Metadata fetch failed (non-blocking):', error)
      }
    }
    
    // Fetch metadata with a small delay to avoid race conditions
    const timeoutId = setTimeout(fetchMetadata, 300)
    return () => clearTimeout(timeoutId)
  }, [url, thumbnailUrl])

  // Fetch oEmbed thumbnail for supported platforms
  useEffect(() => {
    // Only fetch if we have a URL and it's a supported platform
    if (!url || (!isTikTok && !isInstagram && !isYouTube)) {
      return
    }

    // Don't fetch if we already have a thumbnail from OG tags
    // (oEmbed is a fallback/enhancement, not a replacement)
    // Actually, let's try oEmbed first as it's often better quality
    const fetchOEmbedThumbnail = async () => {
      setLoading(true)
      try {
        const response = await fetch('/api/oembed', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url }),
        })

        if (response.ok) {
          const data: OEmbedData = await response.json()
          if (data.thumbnail_url) {
            setOembedThumbnail(data.thumbnail_url)
          }
        }
      } catch (error) {
        console.debug('oEmbed thumbnail fetch failed (non-blocking):', error)
      } finally {
        setLoading(false)
      }
    }

    // Debounce to avoid too many requests
    const timeoutId = setTimeout(fetchOEmbedThumbnail, 300)
    return () => clearTimeout(timeoutId)
  }, [url, isTikTok, isInstagram, isYouTube])

  // Helper function to get proxied image URL for images that might be blocked
  const getProxiedImageUrl = (url: string | null | undefined): string | null => {
    if (!url) return null
    
    try {
      // Decode HTML entities (e.g., &amp; -> &)
      let decodedUrl = url
      if (url.includes('&amp;') || url.includes('&lt;') || url.includes('&gt;')) {
        const tempDiv = document.createElement('div')
        tempDiv.innerHTML = url
        decodedUrl = tempDiv.textContent || tempDiv.innerText || url
      }
      
      // Validate URL format
      const parsedUrl = new URL(decodedUrl)
      const hostname = parsedUrl.hostname.toLowerCase()
      
      // Check if URL is from platforms that commonly block direct image access
      // Match various Facebook CDN patterns (scontent-*.fbcdn.net, fbcdn.net, etc.)
      const needsProxy = hostname.includes('fbcdn.net') || 
                        hostname.includes('cdninstagram.com') ||
                        (hostname.includes('instagram.com') && decodedUrl.includes('/p/')) ||
                        (hostname.includes('facebook.com') && decodedUrl.includes('/photos/')) ||
                        hostname.includes('tiktokcdn.com') ||
                        (hostname.includes('tiktok.com') && decodedUrl.includes('/obj/'))
      
      if (needsProxy) {
        return `/api/image-proxy?url=${encodeURIComponent(decodedUrl)}`
      }
      
      return decodedUrl
    } catch (error) {
      // If URL is invalid, try the original URL anyway
      console.warn('EmbedPreview: Invalid image URL, trying original', { url, error })
      return url
    }
  }

  // Determine which image to show (priority: oEmbed thumbnail > saved thumbnailUrl > fetched OG image)
  // Use fetched OG image if thumbnailUrl prop not provided - makes previews work even when thumbnail_url wasn't saved
  const effectiveThumbnailUrl = thumbnailUrl || fetchedOgImage
  const rawImageUrl = oembedThumbnail || effectiveThumbnailUrl

  if (!rawImageUrl) {
    return null
  }

  // Use proxied URL for Facebook/Instagram images to avoid 403 errors
  const imageUrl = getProxiedImageUrl(rawImageUrl)

  if (!imageUrl) {
    return null
  }

  return (
    <img
      src={imageUrl}
      alt={displayTitle}
      className="w-full h-full object-cover"
      loading="lazy"
      referrerPolicy="no-referrer"
      onLoad={() => {
        setImageError(false)
        onImageLoad?.()
      }}
      onError={(e) => {
        setImageError(true)
        const target = e.target as HTMLImageElement
        // If proxied image fails, try original URL as fallback
        if (imageUrl?.includes('/api/image-proxy') && rawImageUrl && target.src !== rawImageUrl) {
          target.src = rawImageUrl
          return // Don't hide yet, try original URL
        }
        target.style.display = 'none'
        // Show placeholder sibling - find the next sibling div with hidden class
        const parent = target.parentElement
        if (parent) {
          const placeholder = parent.querySelector('.hidden.w-full') as HTMLElement
          if (placeholder) {
            placeholder.classList.remove('hidden')
            placeholder.classList.add('flex')
          }
        }
      }}
    />
  )
}

