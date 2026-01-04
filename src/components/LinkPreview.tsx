'use client'

import { useState, useEffect } from 'react'
import { detectPlatform } from '@/lib/utils'

interface LinkPreviewProps {
  url: string
  ogImage?: string | null
  screenshotUrl?: string | null
  onImageLoad?: () => void
}

interface OEmbedData {
  html?: string | null
  thumbnail_url?: string | null
  author_name?: string | null
  title?: string | null
  provider_name?: string | null
}

export default function LinkPreview({ url, ogImage, screenshotUrl, onImageLoad }: LinkPreviewProps) {
  const [oembedData, setOembedData] = useState<OEmbedData | null>(null)
  const [loading, setLoading] = useState(false)
  const [imageError, setImageError] = useState<string | null>(null)

  // Debug logging
  useEffect(() => {
    if (url.trim()) {
      console.log('LinkPreview: Props received', {
        url,
        hasOGImage: !!ogImage,
        ogImage: ogImage?.substring(0, 100),
        hasScreenshot: !!screenshotUrl,
        screenshotUrl: screenshotUrl?.substring(0, 100),
      })
    }
  }, [url, ogImage, screenshotUrl])

  // Determine which preview to show (in priority order)
  const hasOEmbed = oembedData?.html || oembedData?.thumbnail_url
  const hasOGImage = !!ogImage
  const hasScreenshot = !!screenshotUrl
  const showPreview = hasOEmbed || hasOGImage || hasScreenshot

  const platform = detectPlatform(url)
  const isTikTok = platform === 'TikTok'
  const isInstagram = platform === 'Instagram'
  const isYouTube = platform === 'YouTube'

  // Fetch oEmbed data when URL changes
  useEffect(() => {
    if (!url.trim()) {
      setOembedData(null)
      return
    }

    // Only fetch oEmbed for supported platforms
    if (!isTikTok && !isInstagram && !isYouTube) {
      setOembedData(null)
      return
    }

    const fetchOEmbed = async () => {
      setLoading(true)

      try {
        const response = await fetch('/api/oembed', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url }),
        })

        if (response.ok) {
          const data = await response.json()
          if (data.html || data.thumbnail_url) {
            setOembedData(data)
          } else {
            setOembedData(null)
          }
        } else {
          setOembedData(null)
        }
      } catch (error) {
        console.debug('oEmbed fetch failed (non-blocking):', error)
        setOembedData(null)
      } finally {
        setLoading(false)
      }
    }

    // Debounce oEmbed fetch
    const timeoutId = setTimeout(fetchOEmbed, 500)
    return () => clearTimeout(timeoutId)
  }, [url, isTikTok, isInstagram, isYouTube])

  // Determine preview source and label (priority order)
  // Priority: Screenshot > Embedded link image (oEmbed thumbnail) > OG image > oEmbed HTML
  // Skip sources that have failed to load
  const previewSource = screenshotUrl && imageError !== 'screenshot'
    ? 'screenshot'
    : oembedData?.thumbnail_url && imageError !== 'oembed-thumbnail'
    ? 'oembed-thumbnail'
    : ogImage && imageError !== 'og-image'
    ? 'og-image'
    : oembedData?.html
    ? 'oembed-html'
    : null

  // Debug logging for preview source
  useEffect(() => {
    if (url.trim()) {
      console.log('LinkPreview: Preview source determined', {
        previewSource,
        hasOEmbedHTML: !!oembedData?.html,
        hasOEmbedThumbnail: !!oembedData?.thumbnail_url,
        hasScreenshot: !!screenshotUrl,
        hasOGImage: !!ogImage,
        ogImageValue: ogImage,
        imageError,
      })
    }
  }, [url, previewSource, oembedData, screenshotUrl, ogImage, imageError])

  const previewLabel = oembedData?.provider_name
    ? `Preview from ${oembedData.provider_name}`
    : isTikTok
    ? 'Preview from TikTok'
    : isInstagram
    ? 'Preview from Instagram'
    : isYouTube
    ? 'Preview from YouTube'
    : 'Preview'

  // Render oEmbed HTML (TikTok, Instagram, YouTube return embeddable HTML)
  if (previewSource === 'oembed-html' && oembedData?.html) {
    // TikTok oEmbed HTML includes a blockquote and script tag
    // Instagram and YouTube oEmbed HTML are iframes
    return (
      <div className="w-full bg-gray-50 border border-gray-200 rounded-lg overflow-hidden">
        <div className="px-3 py-2 bg-gray-100 border-b border-gray-200">
          <p className="text-xs text-gray-600">{previewLabel}</p>
        </div>
        <div 
          className="relative w-full flex items-center justify-center bg-white"
          style={{ minHeight: isTikTok ? '600px' : isYouTube ? '450px' : '400px' }}
          dangerouslySetInnerHTML={{ __html: oembedData.html }}
        />
      </div>
    )
  }

  // Render thumbnail/image preview
  if (previewSource === 'oembed-thumbnail' || previewSource === 'og-image' || previewSource === 'screenshot') {
    const imageUrl = previewSource === 'oembed-thumbnail'
      ? oembedData?.thumbnail_url
      : previewSource === 'screenshot'
      ? screenshotUrl
      : ogImage

    if (!imageUrl) {
      // Try next fallback
      if (previewSource === 'oembed-thumbnail' && screenshotUrl) {
        // Fallback to screenshot
        return null // Will be handled by next render cycle
      }
      if (previewSource === 'oembed-thumbnail' && ogImage) {
        // Fallback to OG image
        return null // Will be handled by next render cycle
      }
      return null
    }

    return (
      <div className="w-full bg-gray-50 border border-gray-200 rounded-lg overflow-hidden">
        <div className="px-3 py-2 bg-gray-100 border-b border-gray-200">
          <p className="text-xs text-gray-600">{previewLabel}</p>
        </div>
        <div className="relative w-full bg-gray-100" style={{ aspectRatio: '16/9', minHeight: '200px' }}>
          <img
            src={imageUrl || undefined}
            alt={oembedData?.title || previewLabel}
            className="w-full h-full object-cover"
            onLoad={() => {
              console.log('LinkPreview: Image loaded successfully', { imageUrl, previewSource })
              setImageError(null)
              onImageLoad?.()
            }}
            onError={(e) => {
              console.warn('LinkPreview: Image failed to load', { imageUrl, previewSource })
              // Mark this source as failed and trigger re-render to try next fallback
              setImageError(previewSource)
              e.currentTarget.style.display = 'none'
            }}
          />
        </div>
        {oembedData?.author_name && (
          <div className="px-3 py-2 bg-gray-50 border-t border-gray-200">
            <p className="text-xs text-gray-600">@{oembedData.author_name}</p>
          </div>
        )}
      </div>
    )
  }

  // Show placeholder if no preview available
  // Check if we have any potential sources (even if they failed)
  const hasAnySource = oembedData?.html || oembedData?.thumbnail_url || screenshotUrl || ogImage
  if (url.trim() && !loading && !previewSource && !hasAnySource) {
    return (
      <div className="w-full bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
        <p className="text-sm text-gray-500">
          Preview not available · Add screenshot
        </p>
      </div>
    )
  }

  // If we have sources but all failed, show placeholder
  if (url.trim() && !loading && !previewSource && hasAnySource) {
    return (
      <div className="w-full bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
        <p className="text-sm text-gray-500">
          Preview not available · Add screenshot
        </p>
      </div>
    )
  }

  // Don't render anything while loading or if no URL
  return null
}
