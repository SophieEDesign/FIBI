'use client'

import { useState, useEffect, useRef } from 'react'
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

/** Run script tags that were injected via innerHTML (e.g. TikTok embed.js) so the embed initializes. */
function runEmbedScripts(container: HTMLElement) {
  const scripts = container.querySelectorAll('script')
  scripts.forEach((oldScript) => {
    const newScript = document.createElement('script')
    if (oldScript.src) {
      newScript.src = oldScript.src
    } else {
      newScript.textContent = oldScript.textContent
    }
    if (oldScript.async) newScript.async = true
    container.appendChild(newScript)
  })
}

export default function VideoEmbedBlock({ url, platform = null, minHeight = 450 }: VideoEmbedBlockProps) {
  const [oembedData, setOembedData] = useState<OEmbedData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const embedContainerRef = useRef<HTMLDivElement>(null)

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
        ref={embedContainerRef}
        className="relative w-full flex items-center justify-center [&_iframe]:max-w-full [&_iframe]:w-full [&_iframe]:min-h-[200px]"
        style={{ minHeight: `${minHeight}px` }}
        dangerouslySetInnerHTML={{ __html: sanitizeOembedHtml(oembedData.html) }}
      />
      <EmbedScriptRunner containerRef={embedContainerRef} embedHtml={oembedData.html} />
    </div>
  )
}

/** After embed HTML is injected, run any script tags so TikTok/Instagram embeds initialize. */
function EmbedScriptRunner({
  containerRef,
  embedHtml,
}: {
  containerRef: React.RefObject<HTMLDivElement | null>
  embedHtml: string | null | undefined
}) {
  useEffect(() => {
    const el = containerRef.current
    if (!el || !embedHtml) return
    runEmbedScripts(el)
  }, [containerRef, embedHtml])
  return null
}
