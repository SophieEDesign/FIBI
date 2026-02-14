'use client'

import { useEffect, useRef, useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { SavedItem, Itinerary } from '@/types/database'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import LinkPreview from '@/components/LinkPreview'
import { getHostname } from '@/lib/utils'

// Google Maps types are defined in src/types/google-maps.d.ts
// Note: Using 'any' here because the google namespace isn't resolving in the build
// The runtime types are correct - window.google.maps.Marker and window.google.maps.Map
// are properly typed via the Window interface in src/types/google-maps.d.ts
type GoogleMapsMarker = any // google.maps.Marker (namespace resolution issue)
type GoogleMapsMap = any // google.maps.Map (namespace resolution issue)

interface MapMarker {
  item: SavedItem
  marker: GoogleMapsMarker
}

export default function MapView() {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<GoogleMapsMap | null>(null)
  const markersRef = useRef<MapMarker[]>([])
  const [isGoogleLoaded, setIsGoogleLoaded] = useState(false)
  const [items, setItems] = useState<SavedItem[]>([])
  const [itineraries, setItineraries] = useState<Itinerary[]>([])
  const [selectedItineraryId, setSelectedItineraryId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedItem, setSelectedItem] = useState<SavedItem | null>(null)
  const [showCreateItineraryModal, setShowCreateItineraryModal] = useState(false)
  const [newItineraryName, setNewItineraryName] = useState('')
  const [creatingItinerary, setCreatingItinerary] = useState(false)
  const [showCalendarModal, setShowCalendarModal] = useState(false)
  const [calendarModalItineraryId, setCalendarModalItineraryId] = useState<string | null>(null)
  const [calendarModalDate, setCalendarModalDate] = useState<Date | null>(null)
  const [viewMonth, setViewMonth] = useState(new Date())
  const [savingCalendar, setSavingCalendar] = useState(false)
  const supabase = createClient()
  const router = useRouter()

  // Load Google Maps script
  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY

    if (!apiKey) {
      console.warn('Google Maps API key not found. Map will not load.')
      setLoading(false)
      return
    }

    // Helper function to check if Google Maps is fully loaded
    const checkGoogleMapsLoaded = () => {
      return !!(
        window.google?.maps?.Map &&
        window.google?.maps?.MapTypeId &&
        window.google?.maps?.Marker &&
        window.google?.maps?.LatLng &&
        window.google?.maps?.LatLngBounds
      )
    }

    // Check if script is already loaded and fully initialized
    if (checkGoogleMapsLoaded()) {
      setIsGoogleLoaded(true)
      return
    }

    // Check if script tag already exists
    const existingScript = document.querySelector('script[src*="maps.googleapis.com"]')
    if (existingScript) {
      const checkAndSetLoaded = () => {
        // Wait a bit for the API to fully initialize
        const checkInterval = setInterval(() => {
          if (checkGoogleMapsLoaded()) {
            clearInterval(checkInterval)
            setIsGoogleLoaded(true)
          }
        }, 50)
        
        // Timeout after 5 seconds
        setTimeout(() => {
          clearInterval(checkInterval)
          if (checkGoogleMapsLoaded()) {
            setIsGoogleLoaded(true)
          } else {
            console.warn('Google Maps script loaded but API not fully initialized')
          }
        }, 5000)
      }
      
      existingScript.addEventListener('load', checkAndSetLoaded)
      // Also check immediately in case it's already loaded
      if (checkGoogleMapsLoaded()) {
        setIsGoogleLoaded(true)
      } else {
        checkAndSetLoaded()
      }
      return
    }

    // Load the script with loading=async parameter (recommended by Google)
    const script = document.createElement('script')
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&loading=async`
    script.async = true
    script.defer = true
    script.onload = () => {
      // Wait for the API to fully initialize
      const checkInterval = setInterval(() => {
        if (checkGoogleMapsLoaded()) {
          clearInterval(checkInterval)
          setIsGoogleLoaded(true)
        }
      }, 50)
      
      // Timeout after 5 seconds
      setTimeout(() => {
        clearInterval(checkInterval)
        if (checkGoogleMapsLoaded()) {
          setIsGoogleLoaded(true)
        } else {
          console.error('Google Maps script loaded but API not fully initialized')
          setLoading(false)
        }
      }, 5000)
    }
    script.onerror = () => {
      console.error('Failed to load Google Maps script')
      setLoading(false)
    }
    document.head.appendChild(script)
  }, [])

  // Load itineraries
  const loadItineraries = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) return

      const { data, error } = await supabase
        .from('itineraries')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error loading itineraries:', error)
        setItineraries([])
      } else {
        setItineraries(data || [])
      }
    } catch (error) {
      console.error('Error loading itineraries:', error)
      setItineraries([])
    }
  }

  const createItinerary = async (name: string) => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user || !name.trim()) return null

      const { data, error } = await supabase
        .from('itineraries')
        .insert({
          user_id: user.id,
          name: name.trim(),
        })
        .select()
        .single()

      if (error) throw error

      if (data) {
        setItineraries((prev) => [data, ...prev])
        return data
      }
      return null
    } catch (error) {
      console.error('Error creating itinerary:', error)
      return null
    }
  }

  const handleCreateItinerary = async () => {
    if (!newItineraryName.trim()) return

    setCreatingItinerary(true)
    const newItinerary = await createItinerary(newItineraryName)
    setCreatingItinerary(false)

    if (newItinerary) {
      setSelectedItineraryId(newItinerary.id)
      setShowCreateItineraryModal(false)
      setNewItineraryName('')
    }
  }

  const handleOpenCalendarModal = () => {
    if (!selectedItem) return
    setCalendarModalItineraryId(selectedItem.itinerary_id || null)
    setCalendarModalDate(selectedItem.planned_date ? new Date(selectedItem.planned_date) : null)
    setViewMonth(selectedItem.planned_date ? new Date(selectedItem.planned_date) : new Date())
    setShowCalendarModal(true)
  }

  const handleSaveCalendar = async () => {
    if (!selectedItem) return

    setSavingCalendar(true)
    try {
      const dateStr = calendarModalDate ? calendarModalDate.toISOString().split('T')[0] : null

      let currentStatuses: string[] = []
      if (selectedItem.status) {
        try {
          const parsed = JSON.parse(selectedItem.status)
          currentStatuses = Array.isArray(parsed) ? parsed : [parsed]
        } catch {
          currentStatuses = [selectedItem.status]
        }
      }

      let newStatuses: string[] = []
      if (dateStr) {
        newStatuses = currentStatuses.filter((s) => s !== 'To plan')
        if (!newStatuses.includes('Planned')) {
          newStatuses.push('Planned')
        }
      } else {
        newStatuses = currentStatuses.filter((s) => s !== 'Planned')
        if (!newStatuses.includes('To plan')) {
          newStatuses.push('To plan')
        }
      }

      const updateData: {
        planned_date: string | null
        itinerary_id?: string | null
        status?: string | null
      } = {
        planned_date: dateStr,
        status: newStatuses.length > 0 ? JSON.stringify(newStatuses) : null,
      }

      if (calendarModalItineraryId && dateStr) {
        updateData.itinerary_id = calendarModalItineraryId
      } else if (!dateStr) {
        updateData.itinerary_id = null
      }

      const { error } = await supabase
        .from('saved_items')
        .update(updateData)
        .eq('id', selectedItem.id)

      if (error) throw error

      setItems((prev) =>
        prev.map((item) =>
          item.id === selectedItem.id
            ? {
                ...item,
                planned_date: dateStr,
                itinerary_id: calendarModalItineraryId || null,
                status: updateData.status || null,
              }
            : item
        )
      )

      setSelectedItem({
        ...selectedItem,
        planned_date: dateStr,
        itinerary_id: calendarModalItineraryId || null,
        status: updateData.status || null,
      })

      setShowCalendarModal(false)
      setCalendarModalItineraryId(null)
      setCalendarModalDate(null)
    } catch (error) {
      console.error('Error saving calendar assignment:', error)
      alert('Failed to save calendar assignment. Please try again.')
    } finally {
      setSavingCalendar(false)
    }
  }

  // Fetch saved items with locations
  const fetchItems = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.push('/login')
        return
      }

      // First, fetch ALL items to see what we have
      const { data: allData, error: allError } = await supabase
        .from('saved_items')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (allError) {
        console.error('Error fetching all items:', allError)
        setItems([])
        return
      }

      console.log('MapView: All items fetched:', allData?.length || 0)
      if (allData && allData.length > 0) {
        console.log('MapView: Sample item:', {
          id: allData[0].id,
          title: allData[0].title,
          latitude: allData[0].latitude,
          longitude: allData[0].longitude,
          hasLat: allData[0].latitude != null,
          hasLng: allData[0].longitude != null,
        })
      }

      // Filter for items with valid coordinates
      // Handle both number and string types (PostgreSQL NUMERIC can come back as string)
      const itemsWithCoords = (allData || []).filter(item => {
        // Check if latitude exists and is valid
        const lat = item.latitude
        const hasLat = lat != null && !isNaN(Number(lat))
        
        // Check if longitude exists and is valid
        const lng = item.longitude
        const hasLng = lng != null && !isNaN(Number(lng))
        
        if (!hasLat || !hasLng) {
          console.log('MapView: Filtering out item without valid coordinates:', {
            id: item.id,
            title: item.title,
            latitude: lat,
            longitude: lng,
            latType: typeof lat,
            lngType: typeof lng,
          })
        }
        
        return hasLat && hasLng
      })

      console.log('MapView: Items with coordinates:', itemsWithCoords.length, 'out of', allData?.length || 0)
      // Store all items - filtering by itinerary happens in useMemo
      setItems(itemsWithCoords)
    } catch (error) {
      console.error('Error fetching items:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let subscription: any = null

    const setupSubscription = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.push('/login')
        return
      }

      // Initial fetch
      await fetchItems()
      await loadItineraries()

      // Subscribe to real-time changes
      const channel = supabase
        .channel('saved_items_changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'saved_items',
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            console.log('MapView: Real-time change detected:', payload.eventType, payload.new || payload.old)
            // Refetch items when any change occurs
            fetchItems()
          }
        )
        .subscribe()

      subscription = channel
    }

    setupSubscription()

    return () => {
      if (subscription) {
        subscription.unsubscribe()
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase, router])

  // Initialize map (only once) - use callback to ensure ref is set
  useEffect(() => {
    console.log('MapView: Map initialization effect running', { 
      isGoogleLoaded, 
      hasMapRef: !!mapRef.current, 
      hasMapInstance: !!mapInstanceRef.current 
    })
    
    if (!isGoogleLoaded) {
      console.log('MapView: Google Maps not loaded yet')
      return
    }
    
    if (mapInstanceRef.current) {
      console.log('MapView: Map instance already exists')
      return
    }
    
    // Wait for ref to be available (component needs to render first)
    if (!mapRef.current) {
      console.log('MapView: Map ref not available yet, waiting...')
      // Use requestAnimationFrame to wait for next render cycle
      let timeoutId: NodeJS.Timeout | null = null
      const rafId = requestAnimationFrame(() => {
        // Then use a small timeout to ensure DOM is ready
        timeoutId = setTimeout(() => {
          if (mapRef.current && !mapInstanceRef.current && isGoogleLoaded) {
            console.log('MapView: Map ref now available, creating map')
            createMapInstance()
          } else {
            console.log('MapView: Still waiting for ref after timeout', {
              hasRef: !!mapRef.current,
              hasInstance: !!mapInstanceRef.current,
              isGoogleLoaded
            })
          }
        }, 200)
      })
      return () => {
        cancelAnimationFrame(rafId)
        if (timeoutId) clearTimeout(timeoutId)
      }
    }

    createMapInstance()
  }, [isGoogleLoaded])

  // Separate function to initialize the map
  const createMapInstance = () => {
    if (!mapRef.current || mapInstanceRef.current || !isGoogleLoaded) {
      console.log('MapView: Cannot create map instance', {
        hasRef: !!mapRef.current,
        hasInstance: !!mapInstanceRef.current,
        isGoogleLoaded
      })
      return
    }

    // Ensure Google Maps API is fully loaded and MapTypeId is available
    if (!window.google?.maps?.Map || !window.google?.maps?.MapTypeId) {
      console.log('MapView: Google Maps API not fully initialized yet', {
        hasMap: !!window.google?.maps?.Map,
        hasMapTypeId: !!window.google?.maps?.MapTypeId
      })
      return
    }

    console.log('MapView: Creating map instance')
    // Calm, desaturated map style
    const mapStyle: Array<{
      featureType?: string
      elementType?: string
      stylers?: Array<{ [key: string]: any }>
    }> = [
      {
        featureType: 'poi',
        elementType: 'labels',
        stylers: [{ visibility: 'off' }],
      },
      {
        featureType: 'transit',
        stylers: [{ visibility: 'off' }],
      },
      {
        featureType: 'road',
        elementType: 'labels',
        stylers: [{ visibility: 'simplified' }],
      },
      {
        featureType: 'water',
        stylers: [{ saturation: -50 }, { lightness: 20 }],
      },
      {
        featureType: 'landscape',
        stylers: [{ saturation: -50 }, { lightness: 10 }],
      },
    ]

    // Create map (only once)
    // Use string literal 'roadmap' instead of MapTypeId.ROADMAP for better compatibility
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
    console.log('MapView: Map instance created successfully', { hasMap: !!mapInstanceRef.current })

    // Close modal when clicking on map
    const mapClickListener = map.addListener('click', () => {
      setSelectedItem(null)
    })

    return () => {
      window.google.maps.event.removeListener(mapClickListener)
    }
  }

  // Filter items based on selected itinerary
  const filteredItems = useMemo(() => {
    if (selectedItineraryId === null) {
      // "All" tab - show all items
      return items
    } else {
      // Show only items in the selected itinerary
      return items.filter((item) => item.itinerary_id === selectedItineraryId)
    }
  }, [items, selectedItineraryId])

  // Update markers when items change
  // TODO: Add marker clustering for dense areas (when filtering by itinerary/stage)
  // Future: Use @googlemaps/markerclusterer for better performance with many markers
  useEffect(() => {
    if (!isGoogleLoaded || !mapInstanceRef.current) {
      console.log('MapView: Waiting for Google Maps to load or map instance', { isGoogleLoaded, hasMapInstance: !!mapInstanceRef.current })
      return
    }
    
    const map = mapInstanceRef.current
    
    // Filter items with valid coordinates (should already be filtered, but double-check)
    // Future: Also filter by stage (e.g., show only "Planned" places)
    const itemsWithLocations = filteredItems.filter(item => {
      const lat = item.latitude
      const lng = item.longitude
      // Check for null and ensure they're valid numbers
      return lat != null && !isNaN(Number(lat)) &&
             lng != null && !isNaN(Number(lng))
    })
    console.log('MapView: Updating markers with items', { totalItems: items.length, itemsWithLocations: itemsWithLocations.length })
    
    // Clear existing markers
    markersRef.current.forEach(({ marker }) => marker.setMap(null))
    markersRef.current = []

    if (itemsWithLocations.length === 0) {
      console.log('MapView: No items with locations, cleared markers')
      return
    }

    // Create markers for each item (only those with valid coordinates)
    const bounds = new window.google.maps.LatLngBounds()

    itemsWithLocations.forEach((item) => {
      // Handle PostgreSQL numeric type (can be string or number)
      // Convert to number, handling both string and number types
      const latValue = item.latitude
      const lngValue = item.longitude
      
      // Convert to number (handles both string and number types)
      const lat = typeof latValue === 'string' ? parseFloat(latValue) : Number(latValue)
      const lng = typeof lngValue === 'string' ? parseFloat(lngValue) : Number(lngValue)
      
      // Validate that conversion was successful
      if (isNaN(lat) || isNaN(lng)) {
        console.warn('MapView: Invalid coordinates for item:', item.id, { 
          latitude: latValue, 
          longitude: lngValue, 
          lat, 
          lng,
          latType: typeof latValue,
          lngType: typeof lngValue
        })
        return
      }
      
      // Additional check: ensure values are finite numbers
      if (!isFinite(lat) || !isFinite(lng)) {
        console.warn('MapView: Non-finite coordinates for item:', item.id, { lat, lng })
        return
      }

      // Validate coordinate ranges
      if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
        console.warn('MapView: Coordinates out of range for item:', item.id, { lat, lng })
        return
      }

      console.log('MapView: Creating marker for item:', item.id, { lat, lng, title: item.title })
      const position = new window.google.maps.LatLng(lat, lng)

      // Create custom pin icon (soft, aesthetic)
      const pinIcon = {
        path: window.google.maps.SymbolPath?.CIRCLE || 0, // CIRCLE = 0
        scale: 8,
        fillColor: '#8B5CF6', // Soft purple
        fillOpacity: 0.8,
        strokeColor: '#FFFFFF',
        strokeWeight: 2,
        anchor: new window.google.maps.Point(0, 0),
      }

      const marker = new window.google.maps.Marker({
        position,
        map,
        icon: pinIcon,
        title: item.title || 'Saved place',
        animation: window.google.maps.Animation?.DROP || undefined, // Animation is optional
      })

      // Add click listener - show modal
      marker.addListener('click', () => {
        setSelectedItem(item)
      })

      markersRef.current.push({ item, marker })
      bounds.extend(position)
    })

    // Fit map to show all markers
    if (itemsWithLocations.length > 0 && markersRef.current.length > 0) {
      console.log('MapView: Fitting bounds for', markersRef.current.length, 'markers')
      map.fitBounds(bounds)
      // Add padding
      const padding = 50
      map.padding = {
        top: padding,
        right: padding,
        bottom: padding,
        left: padding,
      }
    } else {
      console.warn('MapView: No markers to fit bounds', { itemsWithLocations: itemsWithLocations.length, markers: markersRef.current.length })
    }
  }, [isGoogleLoaded, filteredItems])

  // Close modal when clicking outside (on backdrop)
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && selectedItem) {
        setSelectedItem(null)
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [selectedItem])

  return (
    <div className="fixed top-0 left-0 right-0 bottom-0 flex flex-col md:top-16">
      {/* Simple header */}
      <div className="bg-white/90 backdrop-blur-sm border-b border-gray-200 z-40 md:sticky md:top-16">
        {/* Itinerary Filter - Top */}
        <div className="px-4 pt-3 pb-2">
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">
            <button
              onClick={() => setSelectedItineraryId(null)}
              className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                selectedItineraryId === null
                  ? 'bg-gray-900 text-white'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              All
            </button>
            {itineraries.map((itinerary) => (
              <button
                key={itinerary.id}
                onClick={() => setSelectedItineraryId(itinerary.id)}
                className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                  selectedItineraryId === itinerary.id
                    ? 'bg-gray-900 text-white'
                    : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                }`}
              >
                {itinerary.name}
              </button>
            ))}
            <button
              onClick={() => setShowCreateItineraryModal(true)}
              className="px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 transition-colors flex items-center gap-1"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              New
            </button>
          </div>
        </div>
        
        {/* Header with logo and actions - hidden on desktop since DesktopNavigation provides this */}
        <div className="px-4 pb-3 flex items-center justify-between md:hidden">
          <Link href="/app" className="text-2xl font-bold text-gray-900">
            FiBi
          </Link>
          <Link
            href={selectedItineraryId ? `/app/add?itinerary_id=${selectedItineraryId}` : '/app/add'}
            className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
          >
            Add Place
          </Link>
        </div>
      </div>
      
      {/* Loading state overlay */}
      {(loading || !isGoogleLoaded) && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-50 z-30">
          <div className="text-center">
            <p className="text-gray-600 mb-2">
              {loading ? 'Loading map data...' : 'Loading Google Maps...'}
            </p>
            {!isGoogleLoaded && (
              <p className="text-sm text-gray-500">Google Maps API key may be missing</p>
            )}
          </div>
        </div>
      )}
      
      {/* Map container - always render so ref is available */}
      <div ref={mapRef} className="flex-1 w-full" />
      
      {/* Modal - shown when pin is clicked */}
      {selectedItem && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={(e) => {
            // Close modal when clicking backdrop
            if (e.target === e.currentTarget) {
              setSelectedItem(null)
            }
          }}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/50" />
          
          {/* Modal Content */}
          <div className="relative bg-white rounded-2xl shadow-xl max-w-sm w-full overflow-hidden">
            <Link 
              href={`/item/${selectedItem.id}`}
              className="block"
            >
              {/* Screenshot or preview */}
              {selectedItem.screenshot_url ? (
                <img
                  src={selectedItem.screenshot_url}
                  alt={selectedItem.title || 'Place'}
                  className="w-full h-48 object-cover"
                />
              ) : (
                <div className="w-full h-48 bg-gray-100 relative overflow-hidden">
                  <LinkPreview
                    url={selectedItem.url}
                    ogImage={selectedItem.thumbnail_url}
                    screenshotUrl={selectedItem.screenshot_url}
                    description={selectedItem.description}
                    platform={selectedItem.platform}
                  />
                </div>
              )}
              
              {/* Content */}
              <div className="p-4">
                <h3 className="font-semibold text-gray-900 text-base mb-2 line-clamp-2">
                  {selectedItem.title || 'Untitled place'}
                </h3>
                {(selectedItem.location_city || selectedItem.location_country) && (
                  <p className="text-sm text-gray-600 mb-3">
                    {[selectedItem.location_city, selectedItem.location_country]
                      .filter(Boolean)
                      .join(', ')}
                  </p>
                )}
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs text-gray-500">Tap to view details →</p>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      handleOpenCalendarModal()
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors shrink-0"
                    aria-label="Add to itinerary or calendar"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    {selectedItem.planned_date
                      ? new Date(selectedItem.planned_date).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                        })
                      : 'Add to calendar'}
                  </button>
                </div>
              </div>
            </Link>
            
            {/* Close button */}
            <button
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                setSelectedItem(null)
              }}
              className="absolute top-4 right-4 p-2 bg-black/70 text-white rounded-full hover:bg-black/90 transition-colors"
              aria-label="Close"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Empty state */}
      {filteredItems.length === 0 && !loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-50/80 pointer-events-none z-30">
          <div className="text-center bg-white rounded-lg shadow-sm p-6 max-w-sm">
            <p className="text-gray-600 mb-2">No places with locations yet</p>
            <p className="text-sm text-gray-500 mb-4">
              Add locations to your saved places to see them on the map
            </p>
            <Link
              href="/app/add"
              className="inline-block bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors pointer-events-auto"
            >
              Add a place with location
            </Link>
          </div>
        </div>
      )}
      
      {/* Debug info (development only) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="absolute bottom-4 left-4 bg-black/70 text-white text-xs p-2 rounded pointer-events-none z-30">
          <div>Items: {items.length}</div>
          <div>Filtered: {filteredItems.length}</div>
          <div>Itinerary: {selectedItineraryId || 'All'}</div>
          <div>Loading: {loading ? 'yes' : 'no'}</div>
          <div>Google Loaded: {isGoogleLoaded ? 'yes' : 'no'}</div>
          <div>Map Instance: {mapInstanceRef.current ? 'yes' : 'no'}</div>
        </div>
      )}

      {/* Create Itinerary Modal */}
      {showCreateItineraryModal && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowCreateItineraryModal(false)
              setNewItineraryName('')
            }
          }}
        >
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Create Itinerary</h2>
            <div className="space-y-4">
              <div>
                <label htmlFor="itinerary-name" className="block text-sm font-medium text-gray-700 mb-2">
                  Name
                </label>
                <input
                  id="itinerary-name"
                  type="text"
                  value={newItineraryName}
                  onChange={(e) => setNewItineraryName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && newItineraryName.trim()) {
                      handleCreateItinerary()
                    }
                  }}
                  placeholder="e.g., Weekend Trip, Italy Ideas"
                  className="w-full px-4 py-2 border border-gray-400 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900 text-gray-900 bg-white"
                  autoFocus
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleCreateItinerary}
                  disabled={!newItineraryName.trim() || creatingItinerary}
                  className="flex-1 bg-gray-900 text-white py-2 px-4 rounded-lg font-medium hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {creatingItinerary ? 'Creating...' : 'Create'}
                </button>
                <button
                  onClick={() => {
                    setShowCreateItineraryModal(false)
                    setNewItineraryName('')
                  }}
                  className="px-6 py-2 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Calendar Assignment Modal - Add to Itinerary / Calendar Date */}
      {showCalendarModal && selectedItem && (
        <MapCalendarAssignmentModal
          item={selectedItem}
          itineraries={itineraries}
          selectedItineraryId={calendarModalItineraryId}
          onItineraryChange={setCalendarModalItineraryId}
          selectedDate={calendarModalDate}
          onDateChange={setCalendarModalDate}
          viewMonth={viewMonth}
          onViewMonthChange={setViewMonth}
          onSave={handleSaveCalendar}
          onClose={() => {
            setShowCalendarModal(false)
            setCalendarModalItineraryId(null)
            setCalendarModalDate(null)
          }}
          saving={savingCalendar}
        />
      )}
    </div>
  )
}

// Calendar Assignment Modal for Map preview
interface MapCalendarAssignmentModalProps {
  item: SavedItem
  itineraries: Itinerary[]
  selectedItineraryId: string | null
  onItineraryChange: (id: string | null) => void
  selectedDate: Date | null
  onDateChange: (date: Date | null) => void
  viewMonth: Date
  onViewMonthChange: (date: Date) => void
  onSave: () => void
  onClose: () => void
  saving: boolean
}

function MapCalendarAssignmentModal({
  item,
  itineraries,
  selectedItineraryId,
  onItineraryChange,
  selectedDate,
  onDateChange,
  viewMonth,
  onViewMonthChange,
  onSave,
  onClose,
  saving,
}: MapCalendarAssignmentModalProps) {
  const [showCreateItinerary, setShowCreateItinerary] = useState(false)
  const [newItineraryName, setNewItineraryName] = useState('')
  const [creatingItinerary, setCreatingItinerary] = useState(false)
  const supabase = createClient()

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [onClose])

  const calendarDays = useMemo(() => {
    const year = viewMonth.getFullYear()
    const month = viewMonth.getMonth()
    const firstDay = new Date(year, month, 1)
    const startDate = new Date(firstDay)
    startDate.setDate(startDate.getDate() - startDate.getDay())
    const days: Date[] = []
    for (let i = 0; i < 42; i++) {
      const date = new Date(startDate)
      date.setDate(startDate.getDate() + i)
      days.push(date)
    }
    return days
  }, [viewMonth])

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ]
  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  const isSameDay = (date1: Date, date2: Date | null) => {
    if (!date2) return false
    return (
      date1.getDate() === date2.getDate() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getFullYear() === date2.getFullYear()
    )
  }

  const handleDateClick = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0]
    const currentDateStr = selectedDate ? selectedDate.toISOString().split('T')[0] : null
    if (dateStr === currentDateStr) {
      onDateChange(null)
    } else {
      onDateChange(date)
    }
  }

  const handleCreateItinerary = async () => {
    if (!newItineraryName.trim()) return
    setCreatingItinerary(true)
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from('itineraries')
        .insert({ user_id: user.id, name: newItineraryName.trim() })
        .select()
        .single()

      if (error) throw error
      if (data) {
        onItineraryChange(data.id)
        setShowCreateItinerary(false)
        setNewItineraryName('')
      }
    } catch (error) {
      console.error('Error creating itinerary:', error)
      alert('Failed to create itinerary. Please try again.')
    } finally {
      setCreatingItinerary(false)
    }
  }

  const displayTitle = item.title || getHostname(item.url)

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-end md:items-center justify-center z-[60] p-4"
      onClick={handleBackdropClick}
    >
      <div className="bg-white rounded-t-2xl md:rounded-2xl max-w-md w-full max-h-[90vh] overflow-hidden shadow-xl flex flex-col">
        <div className="p-5 border-b border-gray-200 flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-semibold text-gray-900">Add to Calendar</h2>
            <p className="text-sm text-gray-600 mt-1 line-clamp-1">{displayTitle}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors ml-2 flex-shrink-0"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Itinerary (optional)</label>
            <div className="space-y-2">
              <select
                value={selectedItineraryId || ''}
                onChange={(e) => onItineraryChange(e.target.value || null)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:ring-2 focus:ring-gray-900 focus:border-gray-900 bg-white"
              >
                <option value="">No itinerary</option>
                {itineraries.map((itinerary) => (
                  <option key={itinerary.id} value={itinerary.id}>
                    {itinerary.name}
                  </option>
                ))}
              </select>
              {!showCreateItinerary ? (
                <button
                  onClick={() => setShowCreateItinerary(true)}
                  className="w-full px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  + Create new itinerary
                </button>
              ) : (
                <div className="space-y-2">
                  <input
                    type="text"
                    value={newItineraryName}
                    onChange={(e) => setNewItineraryName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && newItineraryName.trim()) handleCreateItinerary()
                    }}
                    placeholder="Itinerary name"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:ring-2 focus:ring-gray-900 focus:border-gray-900"
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleCreateItinerary}
                      disabled={!newItineraryName.trim() || creatingItinerary}
                      className="flex-1 px-4 py-2 text-sm font-medium bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {creatingItinerary ? 'Creating...' : 'Create'}
                    </button>
                    <button
                      onClick={() => {
                        setShowCreateItinerary(false)
                        setNewItineraryName('')
                      }}
                      className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Date (optional)</label>
            <div className="mb-4 flex items-center justify-between">
              <button
                onClick={() => {
                  const newDate = new Date(viewMonth)
                  newDate.setMonth(viewMonth.getMonth() - 1)
                  onViewMonthChange(newDate)
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <h3 className="text-lg font-semibold text-gray-900">
                {monthNames[viewMonth.getMonth()]} {viewMonth.getFullYear()}
              </h3>
              <button
                onClick={() => {
                  const newDate = new Date(viewMonth)
                  newDate.setMonth(viewMonth.getMonth() + 1)
                  onViewMonthChange(newDate)
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>

            <div className="grid grid-cols-7 gap-1 mb-2">
              {weekDays.map((day) => (
                <div key={day} className="p-2 text-center text-xs font-medium text-gray-700">
                  {day}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map((day, index) => {
                const isCurrentMonth = day.getMonth() === viewMonth.getMonth()
                const isSelected = isSameDay(day, selectedDate)
                const today = new Date()
                const isToday = isSameDay(day, today)

                return (
                  <button
                    key={index}
                    onClick={() => handleDateClick(day)}
                    className={`p-2 text-sm rounded-lg transition-colors ${
                      !isCurrentMonth
                        ? 'text-gray-300'
                        : isSelected
                        ? 'bg-gray-900 text-white font-medium'
                        : isToday
                        ? 'bg-blue-50 text-blue-600 font-medium'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    {day.getDate()}
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        <div className="border-t border-gray-200 p-5 bg-gray-50">
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-white transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={onSave}
              disabled={saving}
              className="flex-1 bg-gray-900 text-white py-3 px-4 rounded-lg font-medium hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

