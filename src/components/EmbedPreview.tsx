'use client'

import { useState, useEffect } from 'react'
import { detectPlatform } from '@/lib/utils'

interface EmbedPreviewProps {
  url: string
  thumbnailUrl: string | null
  platform: string
  displayTitle: string
  /** Post caption / description – shown in a box below the image when provided */
  description?: string | null
  onImageLoad?: () => void
  /** Called with the remote image URL once it actually loads, so callers can rehost it. */
  onImageResolved?: (imageUrl: string) => void
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
  description,
  onImageLoad,
  onImageResolved,
}: EmbedPreviewProps) {
  const [oembedThumbnail, setOembedThumbnail] = useState<string | null>(null)
  const [fetchedOgImage, setFetchedOgImage] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [failedUrls, setFailedUrls] = useState<string[]>([])

  const isTikTok = platform === 'TikTok'
  const isInstagram = platform === 'Instagram'
  const isYouTube = platform === 'YouTube'
  const isFacebook = platform === 'Facebook'

  const thumbnailFailed = Boolean(thumbnailUrl && failedUrls.includes(thumbnailUrl))

  // Fetch metadata when nothing was saved, or the saved CDN image has expired
  useEffect(() => {
    if (!url.trim()) return

    if (thumbnailUrl && !thumbnailFailed) return
    
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
            setFetchedOgImage(data.image)
          }
        }
      } catch (error) {
        console.debug('Metadata fetch failed (non-blocking):', error)
      }
    }
    
    const timeoutId = setTimeout(fetchMetadata, 300)
    return () => clearTimeout(timeoutId)
  }, [url, thumbnailUrl, thumbnailFailed])

  // Fetch oEmbed thumbnail for supported platforms (including Facebook – uses generic metadata fallback)
  useEffect(() => {
    if (!url.trim()) return
    if (!isTikTok && !isInstagram && !isYouTube && !isFacebook) return

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

    const timeoutId = setTimeout(fetchOEmbedThumbnail, 300)
    return () => clearTimeout(timeoutId)
  }, [url, isTikTok, isInstagram, isYouTube, isFacebook])

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
                        hostname.includes('tiktokcdn') ||
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

  // Priority: fresh oEmbed > saved thumbnail > freshly scraped image.
  // Skip URLs that already failed to load (expired CDN signatures).
  const rawImageUrl =
    [oembedThumbnail, thumbnailUrl, fetchedOgImage].find(
      (candidate) => Boolean(candidate) && !failedUrls.includes(candidate as string)
    ) || null

  // Use proxied URL for Facebook/Instagram images to avoid 403 errors
  const imageUrl = rawImageUrl ? getProxiedImageUrl(rawImageUrl) : null

  // Show built-in placeholder when: no image URL, or image failed to load (e.g. expired CDN)
  // This ensures we always show something - fixes "disappeared" previews in grids that don't provide a placeholder sibling
  const showPlaceholder = !rawImageUrl || !imageUrl

  const placeholderContent = (
    <div className="absolute inset-0 w-full h-full flex items-center justify-center bg-gray-100">
      <div className="text-center">
        <div className="text-gray-400 text-4xl mb-2">
          {platform === 'TikTok' ? '🎵' : platform === 'Instagram' ? '📷' : platform === 'YouTube' ? '▶️' : platform === 'Facebook' ? '📘' : '🔗'}
        </div>
        <p className="text-xs text-gray-500">Preview unavailable</p>
      </div>
    </div>
  )

  const hasCaption = description && description.trim().length > 0

  return (
    <div className="w-full h-full flex flex-col">
      <div className="relative flex-1 min-h-0">
        {showPlaceholder && placeholderContent}
        {rawImageUrl && imageUrl && (
          <img
            src={imageUrl}
            alt={displayTitle}
            className={`w-full h-full object-cover ${showPlaceholder ? 'hidden' : ''}`}
            loading="lazy"
            referrerPolicy="no-referrer"
            onLoad={() => {
              onImageLoad?.()
              if (rawImageUrl) onImageResolved?.(rawImageUrl)
            }}
            onError={(e) => {
              const target = e.target as HTMLImageElement
              // When proxy returns 404, try raw URL once (no-referrer can work for some CDNs)
              if (imageUrl?.includes('/api/image-proxy') && rawImageUrl && target.src !== rawImageUrl) {
                target.src = rawImageUrl
                return
              }
              if (rawImageUrl) {
                setFailedUrls((prev) => (prev.includes(rawImageUrl) ? prev : [...prev, rawImageUrl]))
              }
            }}
          />
        )}
      </div>
      {hasCaption && (
        <div className="flex-shrink-0 px-2 py-1.5 bg-gray-50 border-t border-gray-100 overflow-hidden">
          <p className="text-xs text-gray-500 mb-0.5">Post caption</p>
          <p className="text-xs text-gray-900 whitespace-pre-wrap line-clamp-3 break-words">{description.trim()}</p>
        </div>
      )}
    </div>
  )
}

