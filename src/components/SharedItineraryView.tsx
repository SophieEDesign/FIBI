'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { SavedItem } from '@/types/database'
import { getHostname, isMobileDevice } from '@/lib/utils'
import { getProxiedImageUrl } from '@/lib/image-proxy'
import Link from 'next/link'
import LinkPreview from '@/components/LinkPreview'
import PlaceDetailDrawer from '@/components/PlaceDetailDrawer'
import { createClient } from '@/lib/supabase/client'

interface SharedItineraryViewProps {
  shareToken: string
}

interface SharedItineraryData {
  itinerary: {
    id: string
    name: string
    start_date?: string | null
    end_date?: string | null
    cover_image_url?: string | null
    created_at: string
  }
  items: SavedItem[]
  share_type?: 'copy' | 'collaborate'
}

type GoogleMapsMap = any
type GoogleMapsMarker = any

const UNPLANNED = 'unplanned'

const MAP_STYLE = [
  { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
  { featureType: 'road', elementType: 'labels', stylers: [{ visibility: 'simplified' }] },
  { featureType: 'water', stylers: [{ saturation: -45 }, { lightness: 20 }] },
  { featureType: 'landscape', stylers: [{ saturation: -45 }, { lightness: 10 }] },
]

function toLatLng(item: SavedItem): { lat: number; lng: number } | null {
  const lat = typeof item.latitude === 'string' ? parseFloat(item.latitude) : Number(item.latitude)
  const lng = typeof item.longitude === 'string' ? parseFloat(item.longitude) : Number(item.longitude)
  if (item.latitude == null || item.longitude == null || !isFinite(lat) || !isFinite(lng)) return null
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null
  return { lat, lng }
}

function dayKey(item: SavedItem): string {
  return item.planned_date ? item.planned_date.slice(0, 10) : UNPLANNED
}

function dayLabel(key: string): string {
  if (key === UNPLANNED) return 'Not planned'
  return new Date(`${key}T00:00:00`).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
}

function formatRange(start?: string | null, end?: string | null): string | null {
  if (!start && !end) return null
  const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' }
  const s = start ? new Date(start).toLocaleDateString('en-GB', opts) : null
  const e = end ? new Date(end).toLocaleDateString('en-GB', { ...opts, year: 'numeric' }) : null
  if (s && e) return `${s} – ${e}`
  return s || e
}

/** Loads the Google Maps script once (same key and loader approach as MapView). */
function useGoogleMaps(): boolean {
  const [loaded, setLoaded] = useState(false)
  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
    if (!apiKey) return
    const ready = () => !!(window.google?.maps?.Map && window.google?.maps?.Marker && window.google?.maps?.LatLngBounds)
    if (ready()) {
      setLoaded(true)
      return
    }
    let script = document.querySelector<HTMLScriptElement>('script[src*="maps.googleapis.com"]')
    if (!script) {
      script = document.createElement('script')
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&loading=async`
      script.async = true
      script.defer = true
      document.head.appendChild(script)
    }
    const interval = setInterval(() => {
      if (ready()) {
        clearInterval(interval)
        setLoaded(true)
      }
    }, 80)
    const timeout = setTimeout(() => clearInterval(interval), 10000)
    return () => {
      clearInterval(interval)
      clearTimeout(timeout)
    }
  }, [])
  return loaded
}

export default function SharedItineraryView({ shareToken }: SharedItineraryViewProps) {
  const [data, setData] = useState<SharedItineraryData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedItem, setSelectedItem] = useState<SavedItem | null>(null)
  const [activeDay, setActiveDay] = useState<string>('all')
  const [highlightId, setHighlightId] = useState<string | null>(null)
  const [user, setUser] = useState<{ id: string } | null>(null)
  const [addingToAccount, setAddingToAccount] = useState(false)
  const [addToAccountError, setAddToAccountError] = useState<string | null>(null)
  const [addToAccountSuccess, setAddToAccountSuccess] = useState<{ itinerary_id: string; name: string } | null>(null)
  const [joiningCollaborator, setJoiningCollaborator] = useState(false)
  const [joinCollaboratorError, setJoinCollaboratorError] = useState<string | null>(null)
  const [isMobile, setIsMobile] = useState(false)
  const [linkCopied, setLinkCopied] = useState(false)
  const supabase = createClient()

  const mapsLoaded = useGoogleMaps()
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<GoogleMapsMap | null>(null)
  const markersRef = useRef<Map<string, GoogleMapsMarker>>(new Map())

  const isCollaborateShare = data?.share_type === 'collaborate'
  const sharePath = `/share/itinerary/${shareToken}`
  const signupHref = `/signup?redirect=${encodeURIComponent(sharePath)}`
  const loginHref = `/login?redirect=${encodeURIComponent(sharePath)}`

  useEffect(() => {
    loadSharedItinerary()
  }, [shareToken])

  useEffect(() => {
    setIsMobile(isMobileDevice())
    const handleResize = () => setIsMobile(isMobileDevice())
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    const loadUser = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setUser(session?.user ?? null)
    }
    loadUser()
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })
    return () => subscription.unsubscribe()
  }, [])

  const loadSharedItinerary = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch(`/api/itinerary/share/${shareToken}`)
      if (!response.ok) {
        setError(response.status === 404
          ? 'This trip is no longer available or the link has been revoked.'
          : "Couldn't load this trip. Try again in a moment.")
        return
      }
      setData(await response.json())
    } catch (err) {
      console.error('Error loading shared trip:', err)
      setError("Couldn't load this trip. Try again in a moment.")
    } finally {
      setLoading(false)
    }
  }

  const authHeaders = async (): Promise<HeadersInit> => {
    const { data: { session } } = await supabase.auth.getSession()
    const headers: HeadersInit = { 'Content-Type': 'application/json' }
    if (session?.access_token) headers['Authorization'] = `Bearer ${session.access_token}`
    return headers
  }

  const handleAddToAccount = async () => {
    if (!user) return
    setAddingToAccount(true)
    setAddToAccountError(null)
    try {
      const response = await fetch(`/api/itinerary/share/${shareToken}/add-to-account`, {
        method: 'POST',
        credentials: 'include',
        headers: await authHeaders(),
      })
      const result = await response.json()
      if (response.status === 401) {
        window.location.href = loginHref
        return
      }
      if (!response.ok) {
        setAddToAccountError(result.error || "Couldn't save this trip. Try again.")
        return
      }
      setAddToAccountSuccess({ itinerary_id: result.itinerary_id, name: result.name })
    } catch (err) {
      console.error('Error adding to account:', err)
      setAddToAccountError("Couldn't save this trip. Try again.")
    } finally {
      setAddingToAccount(false)
    }
  }

  const handleJoinCollaborator = async () => {
    if (!user) return
    setJoiningCollaborator(true)
    setJoinCollaboratorError(null)
    try {
      const response = await fetch(`/api/itinerary/share/${shareToken}/join-collaborator`, {
        method: 'POST',
        credentials: 'include',
        headers: await authHeaders(),
      })
      const result = await response.json()
      if (response.status === 401) {
        window.location.href = loginHref
        return
      }
      if (!response.ok) {
        setJoinCollaboratorError(result.error || "Couldn't join this trip. Try again.")
        return
      }
      if (result.redirect_url) window.location.href = result.redirect_url
    } catch (err) {
      console.error('Error joining as collaborator:', err)
      setJoinCollaboratorError("Couldn't join this trip. Try again.")
    } finally {
      setJoiningCollaborator(false)
    }
  }

  const handleShare = async () => {
    const url = window.location.href
    try {
      if (navigator.share) {
        await navigator.share({ title: data?.itinerary.name, url })
        return
      }
      await navigator.clipboard.writeText(url)
      setLinkCopied(true)
      setTimeout(() => setLinkCopied(false), 2000)
    } catch {
      // Share sheet dismissed
    }
  }

  // Planned days first (by date, then trip order), unplanned last. Numbers follow this order.
  const orderedItems = useMemo(() => {
    if (!data) return []
    return [...data.items].sort((a, b) => {
      const ka = dayKey(a)
      const kb = dayKey(b)
      if (ka !== kb) {
        if (ka === UNPLANNED) return 1
        if (kb === UNPLANNED) return -1
        return ka < kb ? -1 : 1
      }
      return (a.trip_position ?? 0) - (b.trip_position ?? 0)
    })
  }, [data])

  const numberById = useMemo(() => new Map(orderedItems.map((item, i) => [item.id, i + 1])), [orderedItems])

  const days = useMemo(() => {
    const counts = new Map<string, number>()
    orderedItems.forEach((item) => counts.set(dayKey(item), (counts.get(dayKey(item)) || 0) + 1))
    return Array.from(counts.entries()).map(([key, count]) => ({ key, count, label: dayLabel(key) }))
  }, [orderedItems])

  const visibleItems = useMemo(
    () => (activeDay === 'all' ? orderedItems : orderedItems.filter((item) => dayKey(item) === activeDay)),
    [orderedItems, activeDay]
  )

  const hasMappable = orderedItems.some((item) => toLatLng(item))
  // Without a Maps key or any coordinates, the cover image takes the map's place
  const canMap = hasMappable && !!process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY

  // Create the map once data and the script are ready
  useEffect(() => {
    if (!mapsLoaded || !canMap || !mapRef.current || mapInstanceRef.current) return
    mapInstanceRef.current = new window.google.maps.Map(mapRef.current, {
      zoom: 12,
      center: { lat: 20, lng: 0 },
      styles: MAP_STYLE,
      disableDefaultUI: true,
      zoomControl: !isMobile,
      gestureHandling: 'greedy',
      clickableIcons: false,
    })
  }, [mapsLoaded, canMap, isMobile, loading])

  // Numbered pins for every place; the selected day is highlighted and framed
  useEffect(() => {
    const map = mapInstanceRef.current
    if (!map || !window.google?.maps) return
    markersRef.current.forEach((marker) => marker.setMap(null))
    markersRef.current.clear()

    const bounds = new window.google.maps.LatLngBounds()
    let framed = 0
    orderedItems.forEach((item) => {
      const pos = toLatLng(item)
      if (!pos) return
      const inDay = activeDay === 'all' || dayKey(item) === activeDay
      const active = highlightId === item.id
      const marker = new window.google.maps.Marker({
        position: pos,
        map,
        title: item.title || item.place_name || 'Saved place',
        label: { text: String(numberById.get(item.id)), color: '#FFFFFF', fontSize: '12px', fontWeight: '600' },
        icon: {
          path: window.google.maps.SymbolPath?.CIRCLE ?? 0,
          scale: active ? 15 : 12,
          fillColor: inDay ? (active ? '#1B80C7' : '#2E9EE8') : '#A3A3A3',
          fillOpacity: 1,
          strokeColor: '#FFFFFF',
          strokeWeight: 2.5,
        },
        zIndex: active ? 3 : inDay ? 2 : 1,
      })
      marker.addListener('click', () => {
        setHighlightId(item.id)
        document.getElementById(`trip-item-${item.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
      })
      markersRef.current.set(item.id, marker)
      if (inDay) {
        bounds.extend(pos)
        framed++
      }
    })
    if (framed === 1) {
      map.setCenter(bounds.getCenter())
      map.setZoom(15)
    } else if (framed > 1) {
      map.fitBounds(bounds, { top: 72, bottom: 48, left: 32, right: 32 })
    }
  }, [orderedItems, activeDay, highlightId, numberById, mapsLoaded, canMap, loading])

  const focusItem = (item: SavedItem) => {
    setHighlightId(item.id)
    const pos = toLatLng(item)
    if (pos) mapInstanceRef.current?.panTo(pos)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-gray-200 border-t-sky-500 mx-auto mb-4" />
          <p className="text-sm text-gray-600">Loading trip…</p>
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-5">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-brand-soft grid place-items-center text-sky-600">
            <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0" />
              <circle cx="12" cy="10" r="3" />
            </svg>
          </div>
          <h1 className="text-xl font-semibold text-gray-900 mb-2">Couldn&apos;t open this trip</h1>
          <p className="text-sm text-gray-600 mb-6">{error}</p>
          <Link href="/" className="inline-flex items-center h-10 px-5 rounded-full bg-sky-500 text-white text-sm font-medium hover:bg-sky-600 transition-colors">
            Go to Fibi
          </Link>
        </div>
      </div>
    )
  }

  const { itinerary } = data
  const dateRange = formatRange(itinerary.start_date, itinerary.end_date)
  const coverUrl = itinerary.cover_image_url || orderedItems[0]?.screenshot_url || orderedItems[0]?.thumbnail_url
  const placeCount = `${orderedItems.length} ${orderedItems.length === 1 ? 'place' : 'places'}`

  const primaryBtn = 'inline-flex items-center justify-center gap-1.5 h-9 px-4 rounded-full text-sm font-medium bg-sky-500 text-white hover:bg-sky-600 active:scale-[0.985] transition disabled:opacity-60 disabled:cursor-not-allowed whitespace-nowrap'
  const secondaryBtn = 'inline-flex items-center justify-center h-9 px-4 rounded-full text-sm font-medium border border-gray-300 text-gray-900 hover:bg-gray-50 transition disabled:opacity-60 whitespace-nowrap'
  const bookmarkIcon = (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16zM12 7v6M9 10h6" />
    </svg>
  )

  const renderCta = () => {
    if (addToAccountSuccess) {
      return (
        <Link href={`/app/calendar?itinerary_id=${encodeURIComponent(addToAccountSuccess.itinerary_id)}`} className={primaryBtn}>
          Open in Fibi
        </Link>
      )
    }
    if (isCollaborateShare) {
      return user ? (
        <button type="button" onClick={handleJoinCollaborator} disabled={joiningCollaborator} className={primaryBtn}>
          {joiningCollaborator ? 'Joining…' : 'Join this trip'}
        </button>
      ) : (
        <Link href={signupHref} className={primaryBtn}>Join this trip</Link>
      )
    }
    return user ? (
      <button type="button" onClick={handleAddToAccount} disabled={addingToAccount} className={primaryBtn}>
        {bookmarkIcon}
        {addingToAccount ? 'Saving…' : 'Save trip'}
      </button>
    ) : (
      <Link href={signupHref} className={primaryBtn}>
        {bookmarkIcon}
        Save trip
      </Link>
    )
  }

  return (
    <div className="min-h-screen bg-white md:flex md:h-screen md:overflow-hidden">
      {/* Map */}
      <div className="relative h-[52vh] min-h-[320px] md:h-auto md:flex-1 bg-gray-100">
        {canMap ? (
          <div ref={mapRef} className="absolute inset-0" />
        ) : coverUrl ? (
          <img src={getProxiedImageUrl(coverUrl) || coverUrl} alt="" className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0 bg-brand-soft" />
        )}

        <div className="absolute top-4 left-4 right-4 flex items-center justify-between pt-[env(safe-area-inset-top)]">
          <Link href="/" className="inline-flex items-center gap-2 h-9 pl-2 pr-3.5 rounded-full bg-white/80 backdrop-blur-xl backdrop-saturate-150 shadow-soft text-sm font-medium text-gray-900">
            <img src="/fibi-mark.png" alt="" className="h-[22px] w-auto" />
            Fibi
          </Link>
          <button
            type="button"
            onClick={handleShare}
            className="inline-flex items-center gap-1.5 h-9 px-3 rounded-full bg-white/80 backdrop-blur-xl backdrop-saturate-150 shadow-soft text-sm font-medium text-gray-900"
            aria-label="Share this trip"
          >
            <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8M16 6l-4-4-4 4M12 2v13" />
            </svg>
            {linkCopied && <span>Link copied</span>}
          </button>
        </div>
      </div>

      {/* Sheet */}
      <section className="relative -mt-7 md:mt-0 md:w-[420px] md:shrink-0 md:overflow-y-auto bg-white rounded-t-sheet md:rounded-none shadow-soft-xl md:shadow-none md:border-l md:border-gray-200 px-5 pt-2.5 pb-12">
        <div className="mx-auto mb-3 h-1 w-9 rounded-full bg-gray-300 md:hidden" aria-hidden />

        <div className="flex items-start justify-between gap-3 md:pt-6">
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-[0.11em] text-gray-500">Shared trip</p>
            <h1 className="mt-1 text-[22px] leading-tight font-semibold text-gray-900">{itinerary.name}</h1>
            <p className="mt-1 text-sm text-gray-600">{dateRange ? `${dateRange} · ${placeCount}` : placeCount}</p>
          </div>
          <div className="shrink-0 pt-5">{renderCta()}</div>
        </div>

        {!user && !addToAccountSuccess && (
          <p className="mt-3 text-sm text-gray-600">
            {isCollaborateShare ? 'Join to add and plan places together.' : 'Save a copy to your own Fibi.'}{' '}
            Already have an account?{' '}
            <Link href={loginHref} className="font-medium text-sky-600 hover:text-sky-700">Sign in</Link>
          </p>
        )}
        {user && isCollaborateShare && !addToAccountSuccess && (
          <button type="button" onClick={handleAddToAccount} disabled={addingToAccount} className={`${secondaryBtn} mt-3`}>
            {addingToAccount ? 'Saving…' : 'Save a copy instead'}
          </button>
        )}
        {addToAccountSuccess && (
          <p className="mt-3 text-sm text-green-700">Saved &ldquo;{addToAccountSuccess.name}&rdquo; to your trips.</p>
        )}
        {(addToAccountError || joinCollaboratorError) && (
          <p className="mt-3 text-sm text-red-700">{addToAccountError || joinCollaboratorError}</p>
        )}

        {/* Day chips */}
        {days.length > 1 && (
          <div className="mt-5 -mx-5 px-5 flex gap-2 overflow-x-auto scrollbar-none">
            {[{ key: 'all', label: 'All', count: orderedItems.length }, ...days].map((d) => (
              <button
                key={d.key}
                type="button"
                onClick={() => {
                  setActiveDay(d.key)
                  setHighlightId(null)
                }}
                aria-pressed={activeDay === d.key}
                className={`shrink-0 h-8 px-3.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                  activeDay === d.key ? 'bg-night-900 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {d.label} <span className="opacity-70">{d.count}</span>
              </button>
            ))}
          </div>
        )}

        {/* Places */}
        {visibleItems.length === 0 ? (
          <p className="mt-10 text-center text-sm text-gray-600">No places in this trip yet.</p>
        ) : (
          <ol className="mt-4 grid gap-2.5">
            {visibleItems.map((item) => {
              const title = item.title || item.place_name || getHostname(item.url)
              const place = item.place_name && item.place_name !== title ? item.place_name : item.formatted_address
              const image = item.screenshot_url || item.thumbnail_url
              const isActive = highlightId === item.id
              return (
                <li key={item.id} id={`trip-item-${item.id}`}>
                  <button
                    type="button"
                    onClick={() => {
                      focusItem(item)
                      setSelectedItem(item)
                    }}
                    onMouseEnter={() => !isMobile && focusItem(item)}
                    className={`w-full grid grid-cols-[24px_72px_minmax(0,1fr)] gap-3 items-center p-2 pr-3 rounded-2xl border text-left transition-colors ${
                      isActive ? 'border-sky-300 bg-sky-50' : 'border-gray-200 bg-white hover:bg-gray-50'
                    }`}
                  >
                    <span className={`w-6 h-6 rounded-full text-xs font-semibold leading-6 text-center text-white ${toLatLng(item) ? 'bg-sky-500' : 'bg-gray-400'}`}>
                      {numberById.get(item.id)}
                    </span>
                    <span className="relative w-[72px] h-[72px] rounded-xl overflow-hidden bg-brand-soft">
                      {image ? (
                        <img src={getProxiedImageUrl(image) || image} alt="" className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
                      ) : (
                        <span className="absolute inset-0">
                          <LinkPreview url={item.url} ogImage={item.thumbnail_url} screenshotUrl={item.screenshot_url} description={item.description} platform={item.platform} hideLabel />
                        </span>
                      )}
                    </span>
                    <span className="min-w-0">
                      <span className="block text-[15px] font-medium text-gray-900 truncate">{title}</span>
                      {place && <span className="block text-[13px] text-gray-600 truncate">{place}</span>}
                      {activeDay === 'all' && (
                        <span className="block mt-0.5 text-xs text-gray-500">{dayLabel(dayKey(item))}</span>
                      )}
                    </span>
                  </button>
                </li>
              )
            })}
          </ol>
        )}
      </section>

      {selectedItem && (
        <PlaceDetailDrawer item={selectedItem} onClose={() => setSelectedItem(null)} isMobile={isMobile} readOnly />
      )}
    </div>
  )
}
