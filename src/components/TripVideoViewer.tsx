'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { SavedItem } from '@/types/database'
import { getHostname } from '@/lib/utils'
import VideoEmbedBlock from '@/components/VideoEmbedBlock'

const VIDEO_PLATFORMS = ['TikTok', 'YouTube', 'Instagram', 'Facebook']

export function isVideoTypeItem(item: SavedItem): boolean {
  return VIDEO_PLATFORMS.includes(item.platform)
}

interface TripVideoViewerProps {
  /** Only video-type items (TikTok, YouTube, Instagram, Facebook). Order preserved. */
  items: SavedItem[]
  /** Index into `items` to show first. */
  initialIndex: number
  onClose: () => void
}

const SWIPE_THRESHOLD_PX = 60

export default function TripVideoViewer({ items, initialIndex, onClose }: TripVideoViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(() =>
    Math.max(0, Math.min(initialIndex, items.length - 1))
  )
  const touchStartY = useRef<number>(0)
  const touchStartX = useRef<number>(0)

  const goPrev = useCallback(() => {
    setCurrentIndex((i) => Math.max(0, i - 1))
  }, [])
  const goNext = useCallback(() => {
    setCurrentIndex((i) => Math.min(items.length - 1, i + 1))
  }, [])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
        return
      }
      if (e.key === 'ArrowDown') {
        goNext()
        return
      }
      if (e.key === 'ArrowUp') {
        goPrev()
        return
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose, goPrev, goNext])

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY
    touchStartX.current = e.touches[0].clientX
  }
  const handleTouchEnd = (e: React.TouchEvent) => {
    const endY = e.changedTouches[0].clientY
    const endX = e.changedTouches[0].clientX
    const deltaY = touchStartY.current - endY
    const deltaX = Math.abs(endX - touchStartX.current)
    if (Math.abs(deltaY) < SWIPE_THRESHOLD_PX || deltaX > Math.abs(deltaY)) return
    if (deltaY > 0) goNext()
    else goPrev()
  }

  if (items.length === 0) return null

  const item = items[currentIndex]
  const displayTitle = item.title || item.place_name || getHostname(item.url)

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-gray-100"
      role="dialog"
      aria-modal="true"
      aria-label="Video viewer"
    >
      {/* Header: close, position, and open-in-platform pill */}
      <div className="flex-shrink-0 flex items-center justify-between gap-3 px-4 py-3 bg-white border-b border-gray-200 shadow-sm safe-area-inset-top">
        <button
          type="button"
          onClick={onClose}
          className="flex-shrink-0 p-2 -ml-2 rounded-full text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors"
          aria-label="Close"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        <span className="text-sm font-medium text-gray-700 tabular-nums">
          {currentIndex + 1} / {items.length}
        </span>
        {item.url ? (
          <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className={`flex-shrink-0 inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium text-white transition-opacity hover:opacity-90 ${
              item.platform === 'TikTok'
                ? 'bg-black'
                : item.platform === 'Instagram'
                  ? 'bg-gradient-to-r from-purple-500 to-pink-500'
                  : item.platform === 'YouTube'
                    ? 'bg-red-600'
                    : 'bg-gray-700'
            }`}
          >
            Open in {item.platform}
          </a>
        ) : (
          <div className="w-10" aria-hidden />
        )}
      </div>

      {/* Swipeable area */}
      <div
        className="flex-1 min-h-0 overflow-hidden flex flex-col touch-pan-y"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <div className="flex-1 min-h-0 overflow-y-auto">
          <div className="max-w-2xl mx-auto px-4 py-6">
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
              <VideoEmbedBlock
                url={item.url}
                platform={item.platform}
                minHeight={item.platform === 'TikTok' ? 600 : 450}
              />
            </div>
            <div className="mt-4">
              <p className="text-base font-medium text-gray-900">{displayTitle}</p>
              <span
                className={`inline-flex items-center mt-2 px-2.5 py-0.5 rounded text-xs font-medium ${
                  item.platform === 'TikTok'
                    ? 'bg-gray-800 text-white'
                    : item.platform === 'Instagram'
                      ? 'bg-gray-600 text-white'
                      : item.platform === 'YouTube'
                        ? 'bg-gray-700 text-white'
                        : 'bg-gray-600 text-white'
                }`}
              >
                {item.platform}
              </span>
            </div>
          </div>
        </div>

        {/* Subtle nav hints (no autoplay; user swipes) */}
        {items.length > 1 && (
          <div className="flex-shrink-0 flex items-center justify-center gap-8 py-4 bg-white/80 border-t border-gray-200">
            <button
              type="button"
              onClick={goPrev}
              disabled={currentIndex === 0}
              className="p-2 rounded-full text-gray-500 hover:text-gray-900 hover:bg-gray-100 disabled:opacity-40 disabled:pointer-events-none transition-colors"
              aria-label="Previous"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
              </svg>
            </button>
            <span className="text-sm text-gray-400">Swipe or use arrows</span>
            <button
              type="button"
              onClick={goNext}
              disabled={currentIndex === items.length - 1}
              className="p-2 rounded-full text-gray-500 hover:text-gray-900 hover:bg-gray-100 disabled:opacity-40 disabled:pointer-events-none transition-colors"
              aria-label="Next"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
