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
  const [loading, setLoading] = useState(false)
  const [imageError, setImageError] = useState(false)

  const isTikTok = platform === 'TikTok'
  const isInstagram = platform === 'Instagram'
  const isYouTube = platform === 'YouTube'

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

  // Determine which image to show (priority: oEmbed thumbnail > OG thumbnail)
  const imageUrl = oembedThumbnail || thumbnailUrl

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

