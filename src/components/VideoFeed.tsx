'use client'

import { useState, useMemo } from 'react'
import { SavedItem } from '@/types/database'
import { getHostname } from '@/lib/utils'
import { getProxiedImageUrl } from '@/lib/image-proxy'
import EmbedPreview from '@/components/EmbedPreview'
import VideoEmbedBlock from '@/components/VideoEmbedBlock'
import TripVideoViewer, { isVideoTypeItem } from '@/components/TripVideoViewer'

interface VideoFeedProps {
  items: SavedItem[]
  /** Optional: when provided, card tap can also trigger this (e.g. open drawer). Not used for expand; expand is handled inside. */
  onSelectItem?: (item: SavedItem) => void
}

export default function VideoFeed({ items, onSelectItem }: VideoFeedProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [fullScreenIndex, setFullScreenIndex] = useState<number | null>(null)

  const videoOnlyItems = useMemo(() => items.filter(isVideoTypeItem), [items])

  const handleCardClick = (item: SavedItem) => {
    setExpandedId((prev) => (prev === item.id ? null : item.id))
    onSelectItem?.(item)
  }

  if (items.length === 0) {
    return (
      <div className="py-12 text-center text-gray-500">
        <p>No places in this trip yet.</p>
        <p className="text-sm mt-1">Add places to see them here.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4 pb-6">
      {items.map((item) => {
        const displayTitle = item.title || item.place_name || getHostname(item.url)
        const isExpanded = expandedId === item.id

        return (
          <div
            key={item.id}
            className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm"
          >
            <button
              type="button"
              onClick={() => handleCardClick(item)}
              className="w-full text-left focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-inset rounded-t-xl"
            >
              <div className="flex gap-4 p-3 sm:p-4">
                <div className="flex-shrink-0 w-28 sm:w-36 aspect-video rounded-lg overflow-hidden bg-gray-100">
                  {item.screenshot_url || item.thumbnail_url ? (
                    <img
                      src={getProxiedImageUrl(item.screenshot_url || item.thumbnail_url) || ''}
                      alt={displayTitle}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <EmbedPreview
                      url={item.url}
                      thumbnailUrl={item.thumbnail_url}
                      platform={item.platform}
                      displayTitle={displayTitle}
                    />
                  )}
                </div>
                <div className="flex-1 min-w-0 flex flex-col justify-center">
                  <p className="font-medium text-gray-900 line-clamp-2">{displayTitle}</p>
                  <span
                    className={`inline-flex items-center mt-1.5 w-fit px-2.5 py-0.5 rounded text-xs font-medium ${
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
                </div>
                <div className="flex-shrink-0 self-center text-gray-400">
                  {isExpanded ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  )}
                </div>
              </div>
            </button>

            {isExpanded && (
              <div className="border-t border-gray-200 bg-gray-50 p-4">
                <VideoEmbedBlock
                  url={item.url}
                  platform={item.platform}
                  minHeight={item.platform === 'TikTok' ? 600 : 450}
                />
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  {isVideoTypeItem(item) && videoOnlyItems.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        const idx = videoOnlyItems.findIndex((i) => i.id === item.id)
                        setFullScreenIndex(idx >= 0 ? idx : 0)
                      }}
                      className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-gray-900 text-white hover:bg-gray-800 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                      </svg>
                      View full screen
                    </button>
                  )}
                  {item.url && (
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
                    >
                      Open in {item.platform}
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </a>
                  )}
                </div>
              </div>
            )}
          </div>
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
