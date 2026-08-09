'use client'

import { useEffect, useRef, useState, useMemo } from 'react'
import type { SavedItem } from '@/types/database'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import SiteFooter from '@/components/SiteFooter'
import { getHostname } from '@/lib/utils'
import { isAnonymousUser } from '@/lib/anonymous-auth'

type BoardMeta = {
  id: string
  name: string
  public_description: string | null
  cover_image_url: string | null
  start_date: string | null
  end_date: string | null
  published_at: string
  public_slug: string
  author_name: string
  place_count: number
}

interface TripBoardViewProps {
  slug: string
  board: BoardMeta
  items: SavedItem[]
}

export default function TripBoardView({ slug, board, items }: TripBoardViewProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const [isGoogleLoaded, setIsGoogleLoaded] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  const mapped = useMemo(
    () =>
      items.filter(
        (i) => i.latitude != null && i.longitude != null && !Number.isNaN(Number(i.latitude))
      ),
    [items]
  )

  const cityHint = useMemo(() => {
    const cities = [
      ...new Set(items.map((i) => i.location_city).filter(Boolean) as string[]),
    ]
    if (cities.length === 1) return cities[0]
    return null
  }, [items])

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUserId(user?.id ?? null)
    })
  }, [supabase])

  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
    if (!apiKey || mapped.length === 0) return

    const ready = () => !!(window.google?.maps?.Map && window.google?.maps?.Marker)
    if (ready()) {
      setIsGoogleLoaded(true)
      return
    }
    const existing = document.querySelector('script[src*="maps.googleapis.com"]')
    if (existing) {
      const id = setInterval(() => {
        if (ready()) {
          clearInterval(id)
          setIsGoogleLoaded(true)
        }
      }, 50)
      return
    }
    const script = document.createElement('script')
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}`
    script.async = true
    script.onload = () => setIsGoogleLoaded(true)
    document.head.appendChild(script)
  }, [mapped.length])

  useEffect(() => {
    if (!isGoogleLoaded || !mapRef.current || mapped.length === 0) return
    const g = window.google.maps as any
    const map = new g.Map(mapRef.current, {
      zoom: 12,
      center: { lat: Number(mapped[0].latitude), lng: Number(mapped[0].longitude) },
      disableDefaultUI: true,
      zoomControl: true,
      styles: [
        { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] },
      ],
    })
    const bounds = new g.LatLngBounds()
    mapped.forEach((item) => {
      const pos = { lat: Number(item.latitude), lng: Number(item.longitude) }
      new g.Marker({ position: pos, map, title: item.title || item.place_name || undefined })
      bounds.extend(pos)
    })
    if (mapped.length > 1) map.fitBounds(bounds, 40)
  }, [isGoogleLoaded, mapped])

  const handleSaveBoard = async () => {
    setError(null)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user || isAnonymousUser(user)) {
      router.push(`/signup?redirect=${encodeURIComponent(`/board/${slug}?save=1`)}`)
      return
    }
    setSaving(true)
    try {
      const res = await fetch(`/api/board/${slug}/save`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to save')
      router.push(`/app/calendar?itinerary=${data.itinerary_id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : "That didn't work. Try again.")
    } finally {
      setSaving(false)
    }
  }

  // Auto-save after signup redirect
  useEffect(() => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    if (params.get('save') === '1' && userId) {
      void handleSaveBoard()
      window.history.replaceState({}, '', `/board/${slug}`)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, slug])

  const placeCount = Number(board.place_count) || items.length

  return (
    <div className="min-h-screen bg-fibi-bg-light flex flex-col">
      <header className="bg-white/90 border-b border-gray-100 sticky top-0 z-10 backdrop-blur-sm">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="text-xl font-semibold text-fibi-text-primary">
            FIBI
          </Link>
          <Link
            href="/add"
            className="text-sm font-medium text-fibi-muted hover:text-fibi-text-primary"
          >
            Try a save
          </Link>
        </div>
      </header>

      <main className="flex-1 max-w-3xl mx-auto w-full px-4 py-8 space-y-6">
        <div>
          <p className="text-xs font-medium text-fibi-muted uppercase tracking-wide">
            Travel board
          </p>
          <h1 className="text-3xl font-semibold text-fibi-text-primary mt-1">{board.name}</h1>
          <p className="text-sm text-fibi-muted mt-2">
            {placeCount} place{placeCount === 1 ? '' : 's'}
            {cityHint ? ` in ${cityHint}` : ''}
            {' · '}
            By {board.author_name}
          </p>
          {board.public_description && (
            <p className="text-fibi-muted mt-3 leading-relaxed">{board.public_description}</p>
          )}
        </div>

        {mapped.length > 0 && (
          <div className="rounded-2xl overflow-hidden border border-gray-100 shadow-sm bg-white">
            <div ref={mapRef} className="w-full h-56 sm:h-72" />
          </div>
        )}

        <ul className="space-y-2">
          {items.map((item) => {
            const title = item.title || item.place_name || getHostname(item.url)
            const loc =
              item.place_name ||
              [item.location_city, item.location_country].filter(Boolean).join(', ')
            return (
              <li
                key={item.id}
                className="bg-white rounded-xl border border-gray-100 p-4 flex gap-3 items-center"
              >
                {(item.screenshot_url || item.thumbnail_url) ? (
                  <img
                    src={item.screenshot_url || item.thumbnail_url || ''}
                    alt=""
                    className="w-14 h-14 rounded-lg object-cover shrink-0"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-lg bg-fibi-blue-light/30 shrink-0" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-fibi-text-primary truncate">{title}</p>
                  {loc && <p className="text-xs text-fibi-muted truncate mt-0.5">{loc}</p>}
                </div>
                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-fibi-primary hover:underline shrink-0"
                >
                  Open
                </a>
              </li>
            )
          })}
        </ul>

        {error && (
          <p className="text-sm text-red-600 text-center">{error}</p>
        )}

        <div className="bg-white rounded-2xl border border-gray-100 p-6 text-center space-y-3 sticky bottom-4 shadow-md">
          <p className="text-sm text-fibi-muted">
            Keep these places in your own FIBI library.
          </p>
          <button
            type="button"
            onClick={handleSaveBoard}
            disabled={saving}
            className="w-full sm:w-auto bg-accent text-white px-8 py-3.5 rounded-full font-medium hover:opacity-95 disabled:opacity-50"
          >
            {saving ? 'Adding…' : 'Add this board to FIBI'}
          </button>
          {!userId && (
            <p className="text-xs text-fibi-muted">
              You&apos;ll create an account — it only takes a moment.
            </p>
          )}
        </div>
      </main>

      <SiteFooter showSignIn />
    </div>
  )
}
