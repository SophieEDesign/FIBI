'use client'

import { useState, useEffect } from 'react'
import { sanitizeOembedHtml } from '@/lib/sanitize-oembed'

interface VideoEmbedBlockProps {
  url: string
  /** Optional platform for loading/error label (TikTok, YouTube, etc.) */
  platform?: string | null
  /** Min height for the embed container (TikTok is tall, YouTube ~450px) */
  minHeight?: number
}

interface OEmbedData {
  html?: string | null
  thumbnail_url?: string | null
  title?: string | null
  error?: string
}

export default function VideoEmbedBlock({ url, platform = null, minHeight = 450 }: VideoEmbedBlockProps) {
  const [oembedData, setOembedData] = useState<OEmbedData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!url?.trim()) {
      setLoading(false)
      setError('No URL')
      return
    }

    let cancelled = false
    setLoading(true)
    setError(null)
    setOembedData(null)

    const fetchOEmbed = async () => {
      try {
        const response = await fetch('/api/oembed', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url }),
        })
        if (cancelled) return
        const data: OEmbedData = await response.json().catch(() => ({}))
        if (data.error) {
          setError(data.error)
          return
        }
        if (data.html) {
          setOembedData(data)
        } else {
          setError('Preview unavailable')
        }
      } catch (err) {
        if (!cancelled) setError('Failed to load preview')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchOEmbed()
    return () => {
      cancelled = true
    }
  }, [url])

  if (loading) {
    return (
      <div
        className="w-full flex items-center justify-center bg-gray-100 rounded-lg"
        style={{ minHeight: `${minHeight}px` }}
      >
        <div className="text-center text-gray-500">
          <div className="inline-block w-8 h-8 border-2 border-gray-400 border-t-transparent rounded-full animate-spin mb-2" />
          <p className="text-sm">Loading preview…</p>
        </div>
      </div>
    )
  }

  if (error || !oembedData?.html) {
    return (
      <div
        className="w-full flex items-center justify-center bg-gray-100 rounded-lg"
        style={{ minHeight: '200px' }}
      >
        <div className="text-center text-gray-500">
          <span className="text-3xl mb-2 block">
            {platform === 'TikTok' ? '🎵' : platform === 'Instagram' ? '📷' : platform === 'YouTube' ? '▶️' : '🔗'}
          </span>
          <p className="text-sm">{error || 'Preview unavailable'}</p>
        </div>
      </div>
    )
  }

  return (
    <div
      className="w-full rounded-lg overflow-hidden bg-white border border-gray-200"
      style={{ minHeight: `${minHeight}px` }}
    >
      <div
        className="relative w-full flex items-center justify-center"
        style={{ minHeight: `${minHeight}px` }}
        dangerouslySetInnerHTML={{ __html: sanitizeOembedHtml(oembedData.html) }}
      />
    </div>
  )
}
