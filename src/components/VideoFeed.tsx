'use client'

import { useState, useMemo, useEffect } from 'react'
import { SavedItem } from '@/types/database'
import { getHostname } from '@/lib/utils'
import VideoEmbedBlock from '@/components/VideoEmbedBlock'
import TripVideoViewer, { isVideoTypeItem } from '@/components/TripVideoViewer'

interface VideoFeedProps {
  items: SavedItem[]
  /** Optional: when provided, item tap can trigger this (e.g. open drawer). */
  onSelectItem?: (item: SavedItem) => void
  /** When true, show only video-type items (TikTok, YouTube, Instagram, Facebook). */
  videoOnly?: boolean
  /** When true and there are video items, open full-screen viewer at index 0 on mount (e.g. mobile). */
  autoOpenFullScreen?: boolean
}

export default function VideoFeed({ items, onSelectItem, videoOnly = false, autoOpenFullScreen = false }: VideoFeedProps) {
  const [fullScreenIndex, setFullScreenIndex] = useState<number | null>(null)

  const videoOnlyItems = useMemo(() => items.filter(isVideoTypeItem), [items])
  const displayItems = videoOnly ? videoOnlyItems : items

  useEffect(() => {
    if (autoOpenFullScreen && videoOnlyItems.length > 0 && fullScreenIndex === null) {
      setFullScreenIndex(0)
    }
  }, [autoOpenFullScreen, videoOnlyItems.length, fullScreenIndex])

  if (items.length === 0) {
    return (
      <div className="py-12 text-center text-gray-500">
        <p>No places in this trip yet.</p>
        <p className="text-sm mt-1">Add places to see them here.</p>
      </div>
    )
  }

  if (videoOnly && videoOnlyItems.length === 0) {
    return (
      <div className="py-12 text-center text-gray-500">
        <p>No videos in this trip.</p>
        <p className="text-sm mt-1">Add TikTok, YouTube, or other video links to see them here.</p>
      </div>
    )
  }

  return (
    <div className={`space-y-8 pb-8 ${videoOnly ? 'min-h-[100vh]' : ''}`}>
      {displayItems.map((item, index) => {
        const displayTitle = item.title || item.place_name || getHostname(item.url)
        const isFirstVideoOnly = videoOnly && index === 0

        return (
          <article
            key={item.id}
            className={`flex flex-col ${isFirstVideoOnly ? 'min-h-[100vh]' : ''}`}
            onClick={() => onSelectItem?.(item)}
          >
            {/* Reel-style: video is the main content, full width */}
            <div className={`w-full rounded-xl overflow-hidden bg-black/5 ${isFirstVideoOnly ? 'min-h-[100vh]' : ''}`}>
              <VideoEmbedBlock
                url={item.url}
                platform={item.platform}
                minHeight={item.platform === 'TikTok' ? 560 : 400}
              />
            </div>
            {/* Caption row: title, platform, actions */}
            <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1">
              <span className="font-medium text-gray-900">{displayTitle}</span>
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                  item.platform === 'TikTok'
                    ? 'bg-black text-white'
                    : item.platform === 'Instagram'
                      ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
                      : item.platform === 'YouTube'
                        ? 'bg-red-600 text-white'
                        : 'bg-gray-600 text-white'
                }`}
              >
                {item.platform}
              </span>
              {isVideoTypeItem(item) && videoOnlyItems.length > 0 && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    const idx = videoOnlyItems.findIndex((i) => i.id === item.id)
                    setFullScreenIndex(idx >= 0 ? idx : 0)
                  }}
                  className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium bg-gray-200 text-gray-800 hover:bg-gray-300 transition-colors"
                >
                  Full screen
                </button>
              )}
              {item.url && (
                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium text-white transition-opacity hover:opacity-90 ${
                    item.platform === 'TikTok'
                      ? 'bg-black'
                      : item.platform === 'Instagram'
                        ? 'bg-gradient-to-r from-purple-500 to-pink-500'
                        : item.platform === 'YouTube'
                          ? 'bg-red-600'
                          : 'bg-gray-600'
                  }`}
                >
                  Open in {item.platform}
                </a>
              )}
            </div>
          </article>
        )
      })}

      {fullScreenIndex !== null && (
        <TripVideoViewer
          items={videoOnlyItems}
          initialIndex={fullScreenIndex}
          onClose={() => setFullScreenIndex(null)}
        />
      )}
    </div>
  )
}
