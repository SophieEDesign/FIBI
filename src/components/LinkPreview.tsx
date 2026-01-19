'use client'

import { useState, useEffect } from 'react'
import { detectPlatform, isMobileDevice } from '@/lib/utils'

interface LinkPreviewProps {
  url: string
  ogImage?: string | null
  screenshotUrl?: string | null
  description?: string | null
  platform?: string | null
  onImageLoad?: () => void
  hideLabel?: boolean
}

interface OEmbedData {
  html?: string | null
  thumbnail_url?: string | null
  author_name?: string | null
  title?: string | null
  provider_name?: string | null
}

export default function LinkPreview({ url, ogImage, screenshotUrl, description, platform: platformProp, onImageLoad, hideLabel = false }: LinkPreviewProps) {
  const [oembedData, setOembedData] = useState<OEmbedData | null>(null)
  const [loading, setLoading] = useState(false)
  const [imageError, setImageError] = useState<string | null>(null)
  const [fetchedOgImage, setFetchedOgImage] = useState<string | null>(null)
  const [isMobile, setIsMobile] = useState(false)

  // Use fetched OG image if ogImage prop not provided - makes previews default behavior
  const effectiveOgImage = ogImage || fetchedOgImage

  // Use provided platform if available, otherwise detect from URL
  const platform = platformProp || detectPlatform(url)
  const isTikTok = platform === 'TikTok'
  const isInstagram = platform === 'Instagram'
  const isYouTube = platform === 'YouTube'
  const isFacebook = platform === 'Facebook'
  const isTwitter = platform === 'Twitter'

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

  // Fetch metadata to get OG image - always try, even if oEmbed provides data
  // This ensures we get preview images for all URLs, not just those with oEmbed thumbnails
  useEffect(() => {
    if (!url.trim()) return
    
    // If we already have ogImage prop, don't fetch (it's already provided)
    if (ogImage) return
    
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
            console.log('LinkPreview: Fetched OG image from metadata API', { image: data.image.substring(0, 100) })
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
  // IMPORTANT: Always prefer image previews over HTML embeds for better UX
  const previewSource = screenshotUrl && imageError !== 'screenshot'
    ? 'screenshot'
    : oembedData?.thumbnail_url && imageError !== 'oembed-thumbnail'
    ? 'oembed-thumbnail'
    : effectiveOgImage && imageError !== 'og-image'
    ? 'og-image'
    : oembedData?.html && !isMobile
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

  // Determine preview label - prioritize provided platform, then oEmbed provider_name, then detected platform, then generic
  // If provider_name is "Generic" or similar, prefer the detected/platform prop
  const providerName = oembedData?.provider_name
  const isGenericProvider = providerName && (providerName.toLowerCase() === 'generic' || providerName.toLowerCase() === 'other')
  
  const previewLabel = (platform && platform !== 'Other' && !isGenericProvider)
    ? `Preview from ${platform}`
    : (providerName && !isGenericProvider)
    ? `Preview from ${providerName}`
    : (platform && platform !== 'Other')
    ? `Preview from ${platform}`
    : 'Preview'

  // Render oEmbed HTML (TikTok, Instagram, YouTube return embeddable HTML)
  // Only on desktop - mobile always uses static preview
  // Only show HTML embed if we don't have any image preview available
  // This ensures images are always preferred over HTML embeds
  if (!isMobile && previewSource === 'oembed-html' && oembedData?.html && !effectiveOgImage && !oembedData?.thumbnail_url) {
    // TikTok oEmbed HTML includes a blockquote and script tag
    // Instagram and YouTube oEmbed HTML are iframes
    return (
      <div className="w-full bg-gray-50 border border-gray-200 rounded-lg overflow-hidden">
        {!hideLabel && (
          <div className="px-3 py-2 bg-gray-100 border-b border-gray-200">
            <p className="text-xs text-gray-600">{previewLabel}</p>
          </div>
        )}
        <div 
          className="relative w-full flex items-center justify-center bg-white"
          style={{ minHeight: isTikTok ? '800px' : isYouTube ? '450px' : '400px' }}
          dangerouslySetInnerHTML={{ __html: oembedData.html }}
        />
        {description && (
          <div className="px-3 py-2 bg-gray-50 border-t border-gray-200 select-text">
            <p className="text-xs text-gray-500 mb-1">Post caption:</p>
            <p className="text-sm text-gray-900 whitespace-pre-wrap break-words select-text">{description}</p>
          </div>
        )}
      </div>
    )
  }

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
      console.warn('LinkPreview: Invalid image URL, trying original', { url, error })
      return url
    }
  }

  // Render thumbnail/image preview (static preview - used on mobile and as fallback on desktop)
  // This is the default preview type - always try to show something
  if (previewSource === 'oembed-thumbnail' || previewSource === 'og-image' || previewSource === 'screenshot') {
    const rawImageUrl = previewSource === 'oembed-thumbnail'
      ? oembedData?.thumbnail_url
      : previewSource === 'screenshot'
      ? screenshotUrl
      : effectiveOgImage // Use effectiveOgImage (fetched or provided)
    
    // Use proxied URL for Facebook/Instagram images to avoid 403 errors
    const imageUrl = getProxiedImageUrl(rawImageUrl)

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
          {!hideLabel && (
            <div className="px-3 py-2 bg-gray-100 border-b border-gray-200">
              <p className="text-xs text-gray-600">{previewLabel}</p>
            </div>
          )}
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
        {!hideLabel && (
          <div className="px-3 py-2 bg-gray-100 border-b border-gray-200">
            <p className="text-xs text-gray-600">{previewLabel}</p>
          </div>
        )}
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
              console.warn('LinkPreview: Image failed to load', { imageUrl, previewSource, rawImageUrl })
              const img = e.currentTarget
              // If proxied image fails, try original URL as fallback
              if (imageUrl?.includes('/api/image-proxy') && rawImageUrl && img.src !== rawImageUrl) {
                img.src = rawImageUrl
                return // Don't mark as error yet, try original URL
              }
              // Mark this source as failed and trigger re-render to try next fallback
              setImageError(previewSource)
              img.style.display = 'none'
            }}
          />
        </div>
        {/* Caption always shown as plain text below image - first class data */}
        {(oembedData?.author_name || description) && (
          <div className="px-3 py-2 bg-gray-50 border-t border-gray-200 space-y-2 select-text">
            {oembedData?.author_name && (
              <p className="text-xs text-gray-600">@{oembedData.author_name}</p>
            )}
            {description && (
              <div className="select-text">
                <p className="text-xs text-gray-500 mb-1">Post caption:</p>
                <p className="text-sm text-gray-900 whitespace-pre-wrap break-words select-text">{description}</p>
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
        {!hideLabel && (
          <div className="px-3 py-2 bg-gray-100 border-b border-gray-200">
            <p className="text-xs text-gray-600">{previewLabel}</p>
          </div>
        )}
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
        {!hideLabel && (
          <div className="px-3 py-2 bg-gray-100 border-b border-gray-200">
            <p className="text-xs text-gray-600">{previewLabel}</p>
          </div>
        )}
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
        {!hideLabel && (
          <div className="px-3 py-2 bg-gray-100 border-b border-gray-200">
            <p className="text-xs text-gray-600">{previewLabel}</p>
          </div>
        )}
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
