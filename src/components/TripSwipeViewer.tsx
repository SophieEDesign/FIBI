'use client'

import { useRef, useEffect, useState, useCallback } from 'react'
import { SavedItem } from '@/types/database'
import { getHostname } from '@/lib/utils'
import { getProxiedImageUrl } from '@/lib/image-proxy'
import VideoEmbedBlock from '@/components/VideoEmbedBlock'
import { isVideoTypeItem } from '@/components/TripVideoViewer'

interface TripSwipeViewerProps {
  /** All items from the current trip (order preserved). */
  items: SavedItem[]
  /** Index into `items` to show first. */
  initialIndex: number
  onClose: () => void
  /** If provided, show a "Details" button that closes the viewer and calls this with the current item (for inline drawer). */
  onOpenDetails?: (item: SavedItem) => void
}

export default function TripSwipeViewer({
  items,
  initialIndex,
  onClose,
  onOpenDetails,
}: TripSwipeViewerProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [currentIndex, setCurrentIndex] = useState(() =>
    Math.max(0, Math.min(initialIndex, items.length - 1))
  )

  // Slide height: viewport minus header (~3.5rem)
  const getSlideHeight = useCallback(() => {
    if (typeof window === 'undefined') return 400
    return Math.max(window.innerHeight - 56, 300)
  }, [])

  // Scroll to initial slide on mount
  useEffect(() => {
    const el = scrollRef.current
    if (!el || items.length === 0) return
    const h = getSlideHeight()
    const target = Math.max(0, Math.min(initialIndex, items.length - 1)) * h
    el.scrollTop = target
    setCurrentIndex(Math.max(0, Math.min(initialIndex, items.length - 1)))
  }, [initialIndex, items.length, getSlideHeight])

  const handleScroll = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    const h = getSlideHeight()
    const index = Math.round(el.scrollTop / h)
    const clamped = Math.max(0, Math.min(index, items.length - 1))
    setCurrentIndex((prev) => (clamped !== prev ? clamped : prev))
  }, [items.length, getSlideHeight])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
        return
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  if (items.length === 0) return null

  const item = items[currentIndex]
  const displayTitle = item.title || item.place_name || getHostname(item.url)

  const handleDetails = () => {
    onClose()
    onOpenDetails?.(item)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-gray-100"
      role="dialog"
      aria-modal="true"
      aria-label="Trip gallery"
    >
      {/* Header: close, position, optional Details */}
      <div className="flex-shrink-0 flex items-center justify-between px-4 py-3 bg-white/95 backdrop-blur-sm border-b border-gray-200 z-10">
        <button
          type="button"
          onClick={onClose}
          className="p-2 -ml-2 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors"
          aria-label="Close"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        <span className="text-sm text-gray-500 tabular-nums">
          {currentIndex + 1} / {items.length}
        </span>
        {onOpenDetails ? (
          <button
            type="button"
            onClick={handleDetails}
            className="p-2 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors text-sm font-medium"
          >
            Details
          </button>
        ) : (
          <div className="w-14" aria-hidden />
        )}
      </div>

      {/* Vertical snap scroll: one full-viewport slide per item */}
      <div
        ref={scrollRef}
        className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden snap-y snap-mandatory overscroll-contain"
        style={{ scrollSnapType: 'y mandatory' }}
        onScroll={handleScroll}
      >
        {items.map((slideItem, index) => (
          <section
            key={slideItem.id}
            className="w-full flex flex-col snap-start snap-always shrink-0"
            style={{ minHeight: 'calc(100dvh - 3.5rem)' }}
            aria-label={`Slide ${index + 1} of ${items.length}`}
          >
            <div className="flex-1 min-h-0 flex flex-col justify-center p-4">
              <div className="max-w-2xl mx-auto w-full">
                {isVideoTypeItem(slideItem) ? (
                  <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                    <VideoEmbedBlock
                      url={slideItem.url}
                      platform={slideItem.platform}
                      minHeight={slideItem.platform === 'TikTok' ? 420 : 360}
                    />
                  </div>
                ) : (
                  <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                    <div className="aspect-video bg-gray-100">
                      {slideItem.screenshot_url || slideItem.thumbnail_url ? (
                        <img
                          src={getProxiedImageUrl(slideItem.screenshot_url || slideItem.thumbnail_url) || ''}
                          alt={slideItem.title || slideItem.place_name || getHostname(slideItem.url)}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400">
                          <span className="text-4xl">🔗</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                <div className="mt-4 text-center">
                  <p className="text-base font-medium text-gray-900">
                    {slideItem.title || slideItem.place_name || getHostname(slideItem.url)}
                  </p>
                  {slideItem.platform && (
                    <span className="inline-flex items-center mt-2 px-2.5 py-0.5 rounded text-xs font-medium bg-gray-600 text-white">
                      {slideItem.platform}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}
