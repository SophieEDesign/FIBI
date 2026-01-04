'use client'

import { useState, useEffect } from 'react'
import { detectPlatform, isMobileDevice } from '@/lib/utils'

interface LinkPreviewProps {
  url: string
  ogImage?: string | null
  screenshotUrl?: string | null
  description?: string | null
  onImageLoad?: () => void
}

interface OEmbedData {
  html?: string | null
  thumbnail_url?: string | null
  author_name?: string | null
  title?: string | null
  provider_name?: string | null
}

export default function LinkPreview({ url, ogImage, screenshotUrl, description, onImageLoad }: LinkPreviewProps) {
  const [oembedData, setOembedData] = useState<OEmbedData | null>(null)
  const [loading, setLoading] = useState(false)
  const [imageError, setImageError] = useState<string | null>(null)
  const [fetchedOgImage, setFetchedOgImage] = useState<string | null>(null)
  const [isMobile, setIsMobile] = useState(false)

  // Use fetched OG image if ogImage prop not provided - makes previews default behavior
  const effectiveOgImage = ogImage || fetchedOgImage

  const platform = detectPlatform(url)
  const isTikTok = platform === 'TikTok'
  const isInstagram = platform === 'Instagram'
  const isYouTube = platform === 'YouTube'

  // Debug logging
  useEffect(() => {
    if (url.trim()) {
      console.log('LinkPreview: Props received', {
        url,
        hasOGImage: !!ogImage,
        hasFetchedOGImage: !!fetchedOgImage,
        effectiveOgImage: !!effectiveOgImage,
        ogImage: ogImage?.substring(0, 100),
        hasScreenshot: !!screenshotUrl,
        screenshotUrl: screenshotUrl?.substring(0, 100),
      })
    }
  }, [url, ogImage, screenshotUrl, fetchedOgImage, effectiveOgImage])

  // Fetch metadata if ogImage not provided - makes previews default behavior
  useEffect(() => {
    if (!url.trim() || ogImage) return // Skip if we already have ogImage or no URL
    
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
    
    // Debounce metadata fetch
    const timeoutId = setTimeout(fetchMetadata, 300)
    return () => clearTimeout(timeoutId)
  }, [url, ogImage])

  // Determine which preview to show (in priority order)
  const hasOEmbed = oembedData?.html || oembedData?.thumbnail_url
  const hasOGImage = !!effectiveOgImage
  const hasScreenshot = !!screenshotUrl
  const showPreview = hasOEmbed || hasOGImage || hasScreenshot

  // Detect mobile device
  useEffect(() => {
    setIsMobile(isMobileDevice())
    const handleResize = () => {
      setIsMobile(isMobileDevice())
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Fetch oEmbed data when URL changes (only on desktop)
  // On mobile, we'll still fetch oEmbed for thumbnail, but not for HTML embeds
  useEffect(() => {
    if (!url.trim()) {
      setOembedData(null)
      return
    }

    // Always try to fetch oEmbed data (including thumbnail_url) for all platforms
    // This ensures we get previews when Meta/Facebook/Instagram publish proper meta tags
    // On mobile, we'll use the thumbnail but not the HTML embed
    // On desktop, we'll use HTML embeds when available for TikTok/Instagram/YouTube

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
          // Always set oEmbed data if we get any response (html, thumbnail_url, or other data)
          // This ensures we capture previews when they become available (e.g., when Meta publishes proper tags)
          if (data.html || data.thumbnail_url || Object.keys(data).length > 0) {
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

    // Try oEmbed for all URLs (not just TikTok/Instagram/YouTube)
    // This makes previews work automatically when platforms add proper meta tags
    // Debounce oEmbed fetch
    const timeoutId = setTimeout(fetchOEmbed, 500)
    return () => clearTimeout(timeoutId)
  }, [url, isMobile])

  // Determine preview source and label (priority order)
  // Priority: Screenshot > Embedded link image (oEmbed thumbnail) > OG image > oEmbed HTML
  // Skip sources that have failed to load
  // Use effectiveOgImage (fetched or provided) - makes previews default
  const previewSource = screenshotUrl && imageError !== 'screenshot'
    ? 'screenshot'
    : oembedData?.thumbnail_url && imageError !== 'oembed-thumbnail'
    ? 'oembed-thumbnail'
    : effectiveOgImage && imageError !== 'og-image'
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
        hasOGImage: !!effectiveOgImage,
        ogImageValue: effectiveOgImage,
        imageError,
      })
    }
  }, [url, previewSource, oembedData, screenshotUrl, effectiveOgImage, imageError])

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
  // Only on desktop - mobile always uses static preview
  if (!isMobile && previewSource === 'oembed-html' && oembedData?.html) {
    // TikTok oEmbed HTML includes a blockquote and script tag
    // Instagram and YouTube oEmbed HTML are iframes
    return (
      <div className="w-full bg-gray-50 border border-gray-200 rounded-lg overflow-hidden">
        <div className="px-3 py-2 bg-gray-100 border-b border-gray-200">
          <p className="text-xs text-gray-600">{previewLabel}</p>
        </div>
        <div 
          className="relative w-full flex items-center justify-center bg-white"
          style={{ minHeight: isTikTok ? '800px' : isYouTube ? '450px' : '400px' }}
          dangerouslySetInnerHTML={{ __html: oembedData.html }}
        />
        {description && (
          <div className="px-3 py-2 bg-gray-50 border-t border-gray-200">
            <p className="text-xs text-gray-500 mb-1">Post caption:</p>
            <p className="text-sm text-gray-900 whitespace-pre-wrap break-words">{description}</p>
          </div>
        )}
      </div>
    )
  }

  // Render thumbnail/image preview (static preview - used on mobile and as fallback on desktop)
  // This is the default preview type - always try to show something
  if (previewSource === 'oembed-thumbnail' || previewSource === 'og-image' || previewSource === 'screenshot') {
    const imageUrl = previewSource === 'oembed-thumbnail'
      ? oembedData?.thumbnail_url
      : previewSource === 'screenshot'
      ? screenshotUrl
      : effectiveOgImage // Use effectiveOgImage (fetched or provided)

    if (!imageUrl) {
      // Try next fallback
      if (previewSource === 'oembed-thumbnail' && screenshotUrl) {
        // Fallback to screenshot
        return null // Will be handled by next render cycle
      }
      if (previewSource === 'oembed-thumbnail' && effectiveOgImage) {
        // Fallback to OG image
        return null // Will be handled by next render cycle
      }
      // If no image available, show placeholder with link - always show something
      return (
        <div className="w-full bg-gray-50 border border-gray-200 rounded-lg overflow-hidden">
          <div className="px-3 py-2 bg-gray-100 border-b border-gray-200">
            <p className="text-xs text-gray-600">{previewLabel}</p>
          </div>
          <div className="p-8 text-center">
            <div className="text-gray-400 text-4xl mb-3">
              {isTikTok ? '🎵' : isInstagram ? '📷' : isYouTube ? '▶️' : '🔗'}
            </div>
            <p className="text-sm text-gray-600 mb-3">No preview available</p>
            {description && (
              <div className="mb-4 text-left">
                <p className="text-xs text-gray-500 mb-1">Post caption:</p>
                <p className="text-sm text-gray-900 whitespace-pre-wrap break-words">{description}</p>
              </div>
            )}
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm text-gray-700 hover:text-gray-900 underline"
            >
              View original content
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          </div>
        </div>
      )
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
        {/* Caption always shown as plain text below image - first class data */}
        {(oembedData?.author_name || description) && (
          <div className="px-3 py-2 bg-gray-50 border-t border-gray-200 space-y-2">
            {oembedData?.author_name && (
              <p className="text-xs text-gray-600">@{oembedData.author_name}</p>
            )}
            {description && (
              <div>
                <p className="text-xs text-gray-500 mb-1">Post caption:</p>
                <p className="text-sm text-gray-900 whitespace-pre-wrap break-words">{description}</p>
              </div>
            )}
          </div>
        )}
        {/* Link to original content - always visible on mobile */}
        <div className="px-3 py-2 bg-white border-t border-gray-200">
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-gray-700 hover:text-gray-900 underline flex items-center gap-1"
          >
            View original content
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
        </div>
      </div>
    )
  }

  // On mobile, if we have oEmbed HTML but no thumbnail, still show a static preview with link
  // This ensures mobile always shows *something*
  if (isMobile && oembedData?.html && !previewSource) {
    return (
      <div className="w-full bg-gray-50 border border-gray-200 rounded-lg overflow-hidden">
        <div className="px-3 py-2 bg-gray-100 border-b border-gray-200">
          <p className="text-xs text-gray-600">{previewLabel}</p>
        </div>
        <div className="px-3 py-8 bg-gray-50 text-center">
          <div className="text-gray-400 text-4xl mb-3">
            {isTikTok ? '🎵' : isInstagram ? '📷' : isYouTube ? '▶️' : '🔗'}
          </div>
          <p className="text-sm text-gray-600 mb-3">Preview not available on mobile</p>
          {description && (
            <div className="mb-4 text-left">
              <p className="text-xs text-gray-500 mb-1">Post caption:</p>
              <p className="text-sm text-gray-900 whitespace-pre-wrap break-words">{description}</p>
            </div>
          )}
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm text-gray-700 hover:text-gray-900 underline"
          >
            View original content
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
        </div>
      </div>
    )
  }

  // Show placeholder if no preview available
  // Check if we have any potential sources (even if they failed)
  // Always show something - previews are default behavior
  const hasAnySource = oembedData?.html || oembedData?.thumbnail_url || screenshotUrl || effectiveOgImage
  if (url.trim() && !loading && !previewSource && !hasAnySource) {
    return (
      <div className="w-full bg-gray-50 border border-gray-200 rounded-lg overflow-hidden">
        <div className="px-3 py-2 bg-gray-100 border-b border-gray-200">
          <p className="text-xs text-gray-600">{previewLabel}</p>
        </div>
        <div className="p-8 text-center">
          <p className="text-sm text-gray-500 mb-3">
            Preview not available · Add screenshot
          </p>
          {description && (
            <div className="mb-4 text-left">
              <p className="text-xs text-gray-500 mb-1">Post caption:</p>
              <p className="text-sm text-gray-900 whitespace-pre-wrap break-words">{description}</p>
            </div>
          )}
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm text-gray-700 hover:text-gray-900 underline"
          >
            View original content
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
        </div>
      </div>
    )
  }

  // If we have sources but all failed, show placeholder with caption - always show something
  if (url.trim() && !loading && !previewSource && hasAnySource) {
    return (
      <div className="w-full bg-gray-50 border border-gray-200 rounded-lg overflow-hidden">
        <div className="px-3 py-2 bg-gray-100 border-b border-gray-200">
          <p className="text-xs text-gray-600">{previewLabel}</p>
        </div>
        <div className="p-8 text-center">
          <p className="text-sm text-gray-500 mb-3">
            Preview not available · Add screenshot
          </p>
          {description && (
            <div className="mb-4 text-left">
              <p className="text-xs text-gray-500 mb-1">Post caption:</p>
              <p className="text-sm text-gray-900 whitespace-pre-wrap break-words">{description}</p>
            </div>
          )}
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm text-gray-700 hover:text-gray-900 underline"
          >
            View original content
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
        </div>
      </div>
    )
  }

  // Don't render anything while loading or if no URL
  return null
}
