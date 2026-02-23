'use client'

import { useEffect, useState, useMemo, useRef } from 'react'
import { SavedItem } from '@/types/database'
import { getHostname, isMobileDevice } from '@/lib/utils'
import { getProxiedImageUrl } from '@/lib/image-proxy'
import Link from 'next/link'
import LinkPreview from '@/components/LinkPreview'
import PlaceDetailDrawer from '@/components/PlaceDetailDrawer'
import VideoFeed from '@/components/VideoFeed'
import TripSwipeViewer from '@/components/TripSwipeViewer'
import VideoEmbedBlock from '@/components/VideoEmbedBlock'
import { isVideoTypeItem } from '@/components/TripVideoViewer'
import CollapsibleOptions from '@/components/CollapsibleOptions'
import { createClient } from '@/lib/supabase/client'

type GoogleMapsMarker = any
type GoogleMapsMap = any

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

interface CalendarDay {
  date: Date
  items: SavedItem[]
  isCurrentMonth: boolean
  isToday: boolean
}

export default function SharedItineraryView({ shareToken }: SharedItineraryViewProps) {
  const [data, setData] = useState<SharedItineraryData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [viewMode, setViewMode] = useState<'moodboard' | 'map' | 'list' | 'videos'>('moodboard')
  const [selectedItem, setSelectedItem] = useState<SavedItem | null>(null)
  const [user, setUser] = useState<{ id: string } | null>(null)
  const [addingToAccount, setAddingToAccount] = useState(false)
  const [addToAccountError, setAddToAccountError] = useState<string | null>(null)
  const [addToAccountSuccess, setAddToAccountSuccess] = useState<{ itinerary_id: string; name: string } | null>(null)
  const [joiningCollaborator, setJoiningCollaborator] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [joinCollaboratorError, setJoinCollaboratorError] = useState<string | null>(null)
  const [swipeViewerOpen, setSwipeViewerOpen] = useState(false)
  const [swipeViewerInitialIndex, setSwipeViewerInitialIndex] = useState(0)
  const [isGoogleMapsLoaded, setIsGoogleMapsLoaded] = useState(false)
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<GoogleMapsMap | null>(null)
  const markersRef = useRef<{ item: SavedItem; marker: GoogleMapsMarker }[]>([])
  const supabase = createClient()

  const isCollaborateShare = data?.share_type === 'collaborate'

  // Items with valid lat/lng for the map
  const itemsWithLocations = useMemo(() => {
    if (!data) return []
    return data.items.filter((item) => {
      const lat = item.latitude
      const lng = item.longitude
      return lat != null && !isNaN(Number(lat)) && lng != null && !isNaN(Number(lng))
    })
  }, [data])

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

  // Load Google Maps script when user switches to map view
  useEffect(() => {
    if (viewMode !== 'map') return
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
    if (!apiKey) return
    const checkLoaded = () =>
      !!(
        typeof window !== 'undefined' &&
        window.google?.maps?.Map &&
        window.google?.maps?.Marker &&
        window.google?.maps?.LatLng &&
        window.google?.maps?.LatLngBounds
      )
    if (checkLoaded()) {
      setIsGoogleMapsLoaded(true)
      return
    }
    const existing = document.querySelector('script[src*="maps.googleapis.com"]')
    if (existing) {
      const id = setInterval(() => {
        if (checkLoaded()) {
          clearInterval(id)
          setIsGoogleMapsLoaded(true)
        }
      }, 50)
      return () => clearInterval(id)
    }
    const script = document.createElement('script')
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&loading=async`
    script.async = true
    script.defer = true
    script.onload = () => {
      const id = setInterval(() => {
        if (checkLoaded()) {
          clearInterval(id)
          setIsGoogleMapsLoaded(true)
        }
      }, 50)
    }
    document.head.appendChild(script)
  }, [viewMode])

  // Clear map when leaving map tab
  useEffect(() => {
    if (viewMode !== 'map') {
      markersRef.current.forEach(({ marker }) => marker.setMap(null))
      markersRef.current = []
      mapInstanceRef.current = null
    }
  }, [viewMode])

  // Init map when map tab is active and Google Maps is loaded
  useEffect(() => {
    if (viewMode !== 'map' || !isGoogleMapsLoaded || !mapRef.current || mapInstanceRef.current) return
    if (!window.google?.maps?.Map || !window.google?.maps?.MapTypeId) return
    const mapStyle: Array<{ featureType?: string; elementType?: string; stylers?: Array<Record<string, unknown>> }> = [
      { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] },
      { featureType: 'transit', stylers: [{ visibility: 'off' }] },
      { featureType: 'road', elementType: 'labels', stylers: [{ visibility: 'simplified' }] },
      { featureType: 'water', stylers: [{ saturation: -50 }, { lightness: 20 }] },
      { featureType: 'landscape', stylers: [{ saturation: -50 }, { lightness: 10 }] },
    ]
    const map = new window.google.maps.Map(mapRef.current, {
      zoom: 2,
      center: { lat: 20, lng: 0 },
      mapTypeId: window.google.maps.MapTypeId?.ROADMAP || 'roadmap',
      styles: mapStyle,
      disableDefaultUI: false,
      zoomControl: true,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: true,
    })
    mapInstanceRef.current = map
    return () => {
      mapInstanceRef.current = null
    }
  }, [viewMode, isGoogleMapsLoaded])

  // Update markers when map is ready and items change
  useEffect(() => {
    if (viewMode !== 'map' || !mapInstanceRef.current || !isGoogleMapsLoaded) return
    const map = mapInstanceRef.current
    markersRef.current.forEach(({ marker }) => marker.setMap(null))
    markersRef.current = []
    if (itemsWithLocations.length === 0) return
    const bounds = new window.google.maps.LatLngBounds()
    itemsWithLocations.forEach((item) => {
      const lat = typeof item.latitude === 'string' ? parseFloat(item.latitude) : Number(item.latitude)
      const lng = typeof item.longitude === 'string' ? parseFloat(item.longitude) : Number(item.longitude)
      if (isNaN(lat) || isNaN(lng) || !isFinite(lat) || !isFinite(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) return
      const position = new window.google.maps.LatLng(lat, lng)
      const marker = new window.google.maps.Marker({
        position,
        map,
        icon: {
          path: window.google.maps.SymbolPath?.CIRCLE || 0,
          scale: 8,
          fillColor: '#8B5CF6',
          fillOpacity: 0.8,
          strokeColor: '#FFFFFF',
          strokeWeight: 2,
          anchor: new window.google.maps.Point(0, 0),
        },
        title: item.title || item.place_name || 'Saved place',
        animation: window.google.maps.Animation?.DROP || undefined,
      })
      marker.addListener('click', () => setSelectedItem(item))
      markersRef.current.push({ item, marker })
      bounds.extend(position)
    })
    if (markersRef.current.length > 0) {
      map.fitBounds(bounds)
      map.padding = { top: 50, right: 50, bottom: 50, left: 50 }
    }
  }, [viewMode, isGoogleMapsLoaded, itemsWithLocations])

  const loadSharedItinerary = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/itinerary/share/${shareToken}`)
      
      if (!response.ok) {
        if (response.status === 404) {
          setError('This trip is no longer available or the link has been revoked.')
        } else {
          setError('Failed to load trip. Please try again later.')
        }
        return
      }

      const result = await response.json()
      setData(result)
    } catch (err) {
      console.error('Error loading shared trip:', err)
      setError('Failed to load trip. Please try again later.')
    } finally {
      setLoading(false)
    }
  }

  const handleAddToAccount = async () => {
    if (!user) return
    setAddingToAccount(true)
    setAddToAccountError(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const headers: HeadersInit = { 'Content-Type': 'application/json' }
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`
      }
      const response = await fetch(`/api/itinerary/share/${shareToken}/add-to-account`, {
        method: 'POST',
        credentials: 'include',
        headers,
      })
      const result = await response.json()
      if (response.status === 401) {
        window.location.href = `/login?redirect=${encodeURIComponent(`/share/itinerary/${shareToken}`)}`
        return
      }
      if (!response.ok) {
        setAddToAccountError(result.error || 'Failed to add to your account.')
        return
      }
      setAddToAccountSuccess({ itinerary_id: result.itinerary_id, name: result.name })
    } catch (err) {
      console.error('Error adding to account:', err)
      setAddToAccountError('Failed to add to your account. Please try again.')
    } finally {
      setAddingToAccount(false)
    }
  }

  const handleJoinCollaborator = async () => {
    if (!user) return
    setJoiningCollaborator(true)
    setJoinCollaboratorError(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const headers: HeadersInit = { 'Content-Type': 'application/json' }
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`
      }
      const response = await fetch(`/api/itinerary/share/${shareToken}/join-collaborator`, {
        method: 'POST',
        credentials: 'include',
        headers,
      })
      const result = await response.json()
      if (response.status === 401) {
        window.location.href = `/login?redirect=${encodeURIComponent(`/share/itinerary/${shareToken}`)}`
        return
      }
      if (!response.ok) {
        setJoinCollaboratorError(result.error || 'Failed to join as collaborator.')
        return
      }
      if (result.redirect_url) {
        window.location.href = result.redirect_url
        return
      }
    } catch (err) {
      console.error('Error joining as collaborator:', err)
      setJoinCollaboratorError('Failed to join. Please try again.')
    } finally {
      setJoiningCollaborator(false)
    }
  }

  // Filter items (Stage filter removed - liked/visited shown as icons on cards)
  const filteredItems = useMemo(() => {
    if (!data) return []
    return data.items
  }, [data])

  // Generate calendar days for current month
  const calendarDays = useMemo(() => {
    if (!data) return []

    const year = currentMonth.getFullYear()
    const month = currentMonth.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const startDate = new Date(firstDay)
    startDate.setDate(startDate.getDate() - startDate.getDay()) // Start from Sunday

    const days: CalendarDay[] = []
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    for (let i = 0; i < 42; i++) {
      const date = new Date(startDate)
      date.setDate(startDate.getDate() + i)
      const dateStr = date.toISOString().split('T')[0]
      const dateObj = new Date(date)
      dateObj.setHours(0, 0, 0, 0)

      const dayItems = filteredItems.filter((item) => {
        if (!item.planned_date) return false
        const plannedDate = new Date(item.planned_date)
        plannedDate.setHours(0, 0, 0, 0)
        return plannedDate.getTime() === dateObj.getTime()
      })

      days.push({
        date: dateObj,
        items: dayItems,
        isCurrentMonth: date.getMonth() === month,
        isToday: dateObj.getTime() === today.getTime(),
      })
    }

    return days
  }, [currentMonth, filteredItems, data])

  // Get unplanned items
  const unplannedItems = useMemo(() => {
    return filteredItems.filter((item) => !item.planned_date)
  }, [filteredItems])

  const monthNames = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ]

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentMonth((prev) => {
      const newDate = new Date(prev)
      if (direction === 'prev') {
        newDate.setMonth(prev.getMonth() - 1)
      } else {
        newDate.setMonth(prev.getMonth() + 1)
      }
      return newDate
    })
  }

  const goToToday = () => {
    setCurrentMonth(new Date())
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading trip...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="mb-4">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Unable to load trip</h2>
          <p className="text-sm text-gray-600 mb-6">{error}</p>
          <Link
            href="/"
            className="inline-block bg-gray-900 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors"
          >
            Go to FiBi
          </Link>
        </div>
      </div>
    )
  }

  if (!data) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-gray-900">{data.itinerary.name}</h1>
              <p className="text-xs text-gray-500 mt-1">Shared trip</p>
              {(data.itinerary.start_date || data.itinerary.end_date) && (
                <p className="text-sm text-gray-500 mt-1">
                  {data.itinerary.start_date && new Date(data.itinerary.start_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                  {data.itinerary.start_date && data.itinerary.end_date && ' – '}
                  {data.itinerary.end_date && new Date(data.itinerary.end_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                </p>
              )}
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              {addToAccountSuccess ? (
                <Link
                  href={`/app/calendar?itinerary_id=${encodeURIComponent(addToAccountSuccess.itinerary_id)}`}
                  className="inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium bg-green-600 text-white hover:bg-green-700 transition-colors"
                >
                  View in my account
                </Link>
              ) : isCollaborateShare ? (
                <>
                  {user ? (
                    <button
                      type="button"
                      onClick={handleJoinCollaborator}
                      disabled={joiningCollaborator}
                      className="inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium bg-gray-900 text-white hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {joiningCollaborator ? (
                        <>
                          <svg className="animate-spin h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                          Joining…
                        </>
                      ) : (
                        'Join as collaborator'
                      )}
                    </button>
                  ) : (
                    <Link
                      href={`/login?redirect=${encodeURIComponent(`/share/itinerary/${shareToken}`)}`}
                      className="inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium bg-gray-900 text-white hover:bg-gray-800 transition-colors"
                    >
                      Join as collaborator
                    </Link>
                  )}
                  {user && (
                    <button
                      type="button"
                      onClick={handleAddToAccount}
                      disabled={addingToAccount}
                      className="inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {addingToAccount ? 'Adding…' : 'Add a copy to my account'}
                    </button>
                  )}
                </>
              ) : user ? (
                <button
                  type="button"
                  onClick={handleAddToAccount}
                  disabled={addingToAccount}
                  className="inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium bg-gray-900 text-white hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {addingToAccount ? (
                    <>
                      <svg className="animate-spin h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Adding…
                    </>
                  ) : (
                    'Add to my account'
                  )}
                </button>
              ) : (
                <Link
                  href={`/login?redirect=${encodeURIComponent(`/share/itinerary/${shareToken}`)}`}
                  className="inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium bg-gray-900 text-white hover:bg-gray-800 transition-colors"
                >
                  Add to my account
                </Link>
              )}
              <Link
                href="/"
                className="text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
              >
                FiBi
              </Link>
            </div>
          </div>
          {addToAccountError && (
            <p className="text-sm text-red-600 mt-2">{addToAccountError}</p>
          )}
          {joinCollaboratorError && (
            <p className="text-sm text-red-600 mt-2">{joinCollaboratorError}</p>
          )}
          {addToAccountSuccess && (
            <p className="text-sm text-green-600 mt-2">Added &quot;{addToAccountSuccess.name}&quot; to your account.</p>
          )}
        </div>
      </header>

      {/* Trip cover hero - reduced height, title moved below */}
      <div className="relative -mx-4 sm:-mx-6 md:-mx-8 lg:-mx-12 overflow-hidden rounded-2xl">
        <div className="relative aspect-[21/11] min-h-[144px] md:min-h-[160px] bg-gray-100">
          {(data.itinerary.cover_image_url || data.items[0]?.screenshot_url || data.items[0]?.thumbnail_url) ? (
            <img
              src={getProxiedImageUrl(data.itinerary.cover_image_url || data.items[0]?.screenshot_url || data.items[0]?.thumbnail_url) || data.itinerary.cover_image_url || data.items[0]?.screenshot_url || data.items[0]?.thumbnail_url || ''}
              alt=""
              className="absolute inset-0 w-full h-full object-cover"
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-gray-200 to-gray-300" />
          )}
          <div
            className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent"
            aria-hidden
          />
        </div>
      </div>

      {/* Title + Date below hero */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-2">
        <h2 className="text-2xl md:text-3xl font-semibold text-[#36454F]">{data.itinerary.name}</h2>
        {(data.itinerary.start_date || data.itinerary.end_date) && (
          <p className="mt-1 text-sm text-gray-500">
            {data.itinerary.start_date && new Date(data.itinerary.start_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
            {data.itinerary.start_date && data.itinerary.end_date && ' – '}
            {data.itinerary.end_date && new Date(data.itinerary.end_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
          </p>
        )}
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-6 md:pb-8">
        {/* View Mode Tabs */}
        <div className="mb-6">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode('moodboard')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                viewMode === 'moodboard'
                  ? 'bg-gray-900 text-white'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              Board
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                viewMode === 'list'
                  ? 'bg-gray-900 text-white'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              List
            </button>
            <button
              onClick={() => setViewMode('map')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                viewMode === 'map'
                  ? 'bg-gray-900 text-white'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              Map
            </button>
            <button
              onClick={() => setViewMode('videos')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                viewMode === 'videos'
                  ? 'bg-gray-900 text-white'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              Videos
            </button>
          </div>
        </div>

        {/* Stage filter removed - liked/visited shown as icons on cards */}

        {/* Videos View: scrollable feed with in-app preview */}
        {viewMode === 'videos' && (
          <VideoFeed items={filteredItems} onSelectItem={setSelectedItem} />
        )}

        {/* Moodboard View: uniform square cards, image-first */}
        {viewMode === 'moodboard' && (
          <div className="min-h-[200px] rounded-2xl p-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
            {filteredItems.length === 0 ? (
              <p className="text-gray-500 text-center py-12 col-span-full">No places in this trip yet.</p>
            ) : (
              filteredItems.map((item, index) => {
                const title = item.title || item.place_name || getHostname(item.url)
                const locationStr = item.formatted_address ||
                  (item.location_city && item.location_country ? `${item.location_city}, ${item.location_country}` : item.location_city || item.location_country) || null
                return (
                <div key={item.id} className="min-w-0">
                  <button
                    type="button"
                    onClick={() => {
                      setSwipeViewerInitialIndex(index)
                      setSwipeViewerOpen(true)
                    }}
                    className="w-full text-left aspect-[4/5] bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm hover:shadow-md hover:border-gray-200 transition-all focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2 flex flex-col min-w-0"
                  >
                    <div className="flex-1 min-h-0 relative bg-gray-100 overflow-hidden">
                      {isVideoTypeItem(item) ? (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <VideoEmbedBlock
                            url={item.url}
                            platform={item.platform}
                            minHeight={200}
                          />
                        </div>
                      ) : item.screenshot_url || item.thumbnail_url ? (
                        <img
                          src={getProxiedImageUrl(item.screenshot_url || item.thumbnail_url) || ''}
                          alt={title}
                          className="absolute inset-0 w-full h-full object-cover"
                        />
                      ) : (
                        <div className="absolute inset-0">
                          <LinkPreview
                            url={item.url}
                            ogImage={item.thumbnail_url}
                            screenshotUrl={item.screenshot_url}
                            description={item.description}
                            platform={item.platform}
                            hideLabel
                          />
                        </div>
                      )}
                      {/* Liked / Planned overlay icons - top-right (24px, only when active) */}
                      {(item.liked || item.planned) && (
                        <div className="absolute top-2 right-2 flex items-center gap-1.5 z-10">
                          {item.planned && (
                            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-black/50 text-white" aria-label="Planned">
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                              </svg>
                            </span>
                          )}
                          {item.liked && (
                            <span className={`flex items-center justify-center rounded-full bg-black/50 text-white ${item.planned ? 'w-5 h-5' : 'w-6 h-6'}`} aria-label="Liked">
                              <svg className={item.planned ? 'w-3.5 h-3.5' : 'w-5 h-5'} fill="currentColor" viewBox="0 0 24 24">
                                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                              </svg>
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="px-3 py-2 flex-shrink-0 border-t border-gray-100 space-y-0.5">
                      <p className="text-sm font-medium text-gray-900 truncate">{title}</p>
                      {isVideoTypeItem(item) ? (
                        <span className="text-xs text-gray-500">{item.platform}</span>
                      ) : locationStr ? (
                        <p className="text-xs text-gray-500 truncate">{locationStr}</p>
                      ) : null}
                    </div>
                  </button>
                </div>
              )})
            )}
          </div>
        )}

        {/* List View */}
        {viewMode === 'list' && (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="p-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                {filteredItems.length} {filteredItems.length === 1 ? 'place' : 'places'}
              </h2>
            </div>
            <div className="divide-y divide-gray-200">
              {filteredItems.map((item, index) => (
                <div
                  key={item.id}
                  onClick={() => {
                    setSwipeViewerInitialIndex(index)
                    setSwipeViewerOpen(true)
                  }}
                  className="p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  <div className="flex gap-4">
                    <div className="w-24 h-24 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                      {item.screenshot_url ? (
                        <img
                          src={getProxiedImageUrl(item.screenshot_url) || item.screenshot_url}
                          alt={item.title || getHostname(item.url)}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <LinkPreview
                          url={item.url}
                          ogImage={item.thumbnail_url}
                          screenshotUrl={item.screenshot_url}
                          description={item.description}
                        />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-base font-medium text-gray-900 mb-1">
                        {item.title || getHostname(item.url)}
                      </h3>
                      {(item.place_name || item.formatted_address) && (
                        <p className="text-xs text-gray-500">
                          {item.place_name || item.formatted_address}
                        </p>
                      )}
                      {item.planned_date && (
                        <p className="text-xs text-gray-500 mt-1">
                          {new Date(item.planned_date).toLocaleDateString('en-US', {
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric',
                          })}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Map View */}
        {viewMode === 'map' && (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="aspect-video w-full min-h-[280px] relative bg-gray-100">
              {!process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ? (
                <div className="absolute inset-0 flex items-center justify-center">
                  <p className="text-sm text-gray-500">Map unavailable (no API key)</p>
                </div>
              ) : itemsWithLocations.length === 0 ? (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center px-4">
                    <svg
                      className="mx-auto h-10 w-10 text-gray-400 mb-2"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                    </svg>
                    <p className="text-sm text-gray-600">No places with locations to show on the map</p>
                  </div>
                </div>
              ) : (
                <div ref={mapRef} className="absolute inset-0 w-full h-full" />
              )}
              {process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY && itemsWithLocations.length > 0 && !isGoogleMapsLoaded && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
                  <p className="text-sm text-gray-500">Loading map…</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* CTA Section */}
        <div className="mt-8 bg-white rounded-xl border border-gray-200 p-6 text-center">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Save a copy to your FiBi
          </h3>
          <p className="text-sm text-gray-600 mb-4">
            Create your own travel plans and keep track of places you want to visit.
          </p>
          <Link
            href={`/login?redirect=${encodeURIComponent(`/share/itinerary/${shareToken}`)}`}
            className="inline-block bg-gray-900 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors"
          >
            Get started
          </Link>
        </div>
      </main>

      {/* Place Detail Drawer (read-only for shared view) */}
      {swipeViewerOpen && data && (
        <TripSwipeViewer
          items={filteredItems}
          initialIndex={swipeViewerInitialIndex}
          onClose={() => setSwipeViewerOpen(false)}
          onOpenDetails={(item) => setSelectedItem(item)}
        />
      )}
      {selectedItem && (
        <PlaceDetailDrawer
          item={selectedItem}
          onClose={() => setSelectedItem(null)}
          isMobile={isMobile}
          readOnly
        />
      )}
    </div>
  )
}

// Place Card Component
interface PlaceCardProps {
  item: SavedItem
  compact?: boolean
  onSelect?: () => void
}

function PlaceCard({ item, compact = false, onSelect }: PlaceCardProps) {
  const displayTitle = item.title || getHostname(item.url)

  if (compact) {
    return (
      <div
        onClick={onSelect}
        className="bg-white rounded border border-gray-200 p-1.5 cursor-pointer hover:shadow-sm transition-shadow"
      >
        <div className="aspect-video rounded mb-1 overflow-hidden bg-gray-100">
          {item.screenshot_url ? (
            <img
              src={getProxiedImageUrl(item.screenshot_url) || item.screenshot_url}
              alt={displayTitle}
              className="w-full h-full object-cover"
            />
          ) : (
            <LinkPreview
              url={item.url}
              ogImage={item.thumbnail_url}
              screenshotUrl={item.screenshot_url}
              description={item.description}
            />
          )}
        </div>
        <p className="text-xs font-medium text-gray-900 line-clamp-1">{displayTitle}</p>
      </div>
    )
  }

  return (
    <div
      onClick={onSelect}
      className="bg-white rounded-lg border border-gray-200 p-2 w-32 md:w-40 cursor-pointer hover:shadow-md transition-shadow"
    >
      <div className="aspect-video rounded mb-2 overflow-hidden bg-gray-100">
        {item.screenshot_url ? (
          <img
            src={getProxiedImageUrl(item.screenshot_url) || item.screenshot_url}
            alt={displayTitle}
            className="w-full h-full object-cover"
          />
        ) : (
          <LinkPreview
            url={item.url}
            ogImage={item.thumbnail_url}
            screenshotUrl={item.screenshot_url}
            description={item.description}
          />
        )}
      </div>
      <p className="text-xs md:text-sm font-medium text-gray-900 line-clamp-2">
        {displayTitle}
      </p>
    </div>
  )
}


