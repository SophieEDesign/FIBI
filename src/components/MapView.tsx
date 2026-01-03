'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { SavedItem } from '@/types/database'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

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
  const [loading, setLoading] = useState(true)
  const [selectedItem, setSelectedItem] = useState<SavedItem | null>(null)
  const [previewPosition, setPreviewPosition] = useState<{ x: number; y: number } | null>(null)
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

    // Check if script is already loaded
    if (window.google?.maps?.Map) {
      setIsGoogleLoaded(true)
      return
    }

    // Check if script tag already exists
    const existingScript = document.querySelector('script[src*="maps.googleapis.com"]')
    if (existingScript) {
      existingScript.addEventListener('load', () => {
        setIsGoogleLoaded(true)
      })
      if (window.google?.maps?.Map) {
        setIsGoogleLoaded(true)
      }
      return
    }

    // Load the script
    const script = document.createElement('script')
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`
    script.async = true
    script.defer = true
    script.onload = () => {
      setIsGoogleLoaded(true)
    }
    script.onerror = () => {
      console.error('Failed to load Google Maps script')
      setLoading(false)
    }
    document.head.appendChild(script)
  }, [])

  // Fetch saved items with locations
  useEffect(() => {
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
        const itemsWithCoords = (allData || []).filter(item => {
          const hasLat = item.latitude != null && item.latitude !== ''
          const hasLng = item.longitude != null && item.longitude !== ''
          return hasLat && hasLng
        })

        console.log('MapView: Items with coordinates:', itemsWithCoords.length, 'out of', allData?.length || 0)
        setItems(itemsWithCoords)
      } catch (error) {
        console.error('Error fetching items:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchItems()
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
    const map = new window.google.maps.Map(mapRef.current, {
      zoom: 2,
      center: { lat: 20, lng: 0 },
      mapTypeId: window.google.maps.MapTypeId.ROADMAP,
      styles: mapStyle,
      disableDefaultUI: false,
      zoomControl: true,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: true,
    })

    mapInstanceRef.current = map
    console.log('MapView: Map instance created successfully', { hasMap: !!mapInstanceRef.current })

    // Close preview when clicking on map
    const mapClickListener = map.addListener('click', () => {
      setSelectedItem(null)
      setPreviewPosition(null)
    })

    return () => {
      window.google.maps.event.removeListener(mapClickListener)
    }
  }

  // Update markers when items change
  useEffect(() => {
    if (!isGoogleLoaded || !mapInstanceRef.current) {
      console.log('MapView: Waiting for Google Maps to load or map instance', { isGoogleLoaded, hasMapInstance: !!mapInstanceRef.current })
      return
    }
    
    const map = mapInstanceRef.current
    
    // Filter items with valid coordinates
    const itemsWithLocations = items.filter(item => item.latitude != null && item.longitude != null)
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
      let lat: number
      let lng: number
      
      if (typeof item.latitude === 'string') {
        lat = parseFloat(item.latitude)
      } else if (typeof item.latitude === 'number') {
        lat = item.latitude
      } else {
        console.warn('MapView: Invalid latitude type for item:', item.id, { latitude: item.latitude, type: typeof item.latitude })
        return
      }
      
      if (typeof item.longitude === 'string') {
        lng = parseFloat(item.longitude)
      } else if (typeof item.longitude === 'number') {
        lng = item.longitude
      } else {
        console.warn('MapView: Invalid longitude type for item:', item.id, { longitude: item.longitude, type: typeof item.longitude })
        return
      }
      
      if (isNaN(lat) || isNaN(lng)) {
        console.warn('MapView: Invalid coordinates for item:', item.id, { 
          latitude: item.latitude, 
          longitude: item.longitude, 
          lat, 
          lng,
          latType: typeof item.latitude,
          lngType: typeof item.longitude
        })
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
        path: window.google.maps.SymbolPath.CIRCLE,
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
        animation: window.google.maps.Animation.DROP,
      })

      // Add click listener
      marker.addListener('click', () => {
        const projection = map.getProjection()
        if (!projection) return

        const scale = Math.pow(2, map.getZoom() || 10)
        const worldCoordinate = projection.fromLatLngToPoint(position)
        
        const mapDiv = mapRef.current
        if (!mapDiv) return

        const mapBounds = mapDiv.getBoundingClientRect()
        const x = worldCoordinate.x * scale + mapBounds.left
        const y = worldCoordinate.y * scale + mapBounds.top - 140 // Position above pin

        setPreviewPosition({ x, y })
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
  }, [isGoogleLoaded, items])

  // Close preview when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (selectedItem && previewPosition) {
        const previewCard = document.getElementById('preview-card')
        if (previewCard && !previewCard.contains(e.target as Node)) {
          // Check if click is on map
          if (mapRef.current?.contains(e.target as Node)) {
            setSelectedItem(null)
            setPreviewPosition(null)
          }
        }
      }
    }

    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [selectedItem, previewPosition])

  return (
    <div className="fixed inset-0 flex flex-col">
      {/* Simple header */}
      <div className="bg-white/90 backdrop-blur-sm border-b border-gray-200 px-4 py-3 z-20 flex items-center justify-between">
        <Link href="/app" className="text-2xl font-bold text-gray-900">
          FiBi
        </Link>
        <Link
          href="/app"
          className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
        >
          Back to places
        </Link>
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
      
      {/* Preview Card */}
      {selectedItem && previewPosition && (
        <div
          id="preview-card"
          className="absolute z-10 bg-white rounded-lg shadow-lg overflow-hidden max-w-xs pointer-events-auto"
          style={{
            left: `${previewPosition.x}px`,
            top: `${previewPosition.y}px`,
            transform: 'translateX(-50%)',
          }}
        >
          <Link href={`/item/${selectedItem.id}`}>
            {/* Screenshot or placeholder */}
            {selectedItem.screenshot_url ? (
              <img
                src={selectedItem.screenshot_url}
                alt={selectedItem.title || 'Place'}
                className="w-full h-32 object-cover"
              />
            ) : (
              <div className="w-full h-32 bg-gray-100 flex items-center justify-center">
                <svg
                  className="w-12 h-12 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
              </div>
            )}
            
            {/* Content */}
            <div className="p-3">
              <h3 className="font-semibold text-gray-900 text-sm mb-1 line-clamp-2">
                {selectedItem.title || 'Untitled place'}
              </h3>
              {(selectedItem.location_city || selectedItem.location_country) && (
                <p className="text-xs text-gray-600">
                  {[selectedItem.location_city, selectedItem.location_country]
                    .filter(Boolean)
                    .join(', ')}
                </p>
              )}
            </div>
          </Link>
        </div>
      )}

      {/* Empty state */}
      {items.length === 0 && !loading && (
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
          <div>Loading: {loading ? 'yes' : 'no'}</div>
          <div>Google Loaded: {isGoogleLoaded ? 'yes' : 'no'}</div>
          <div>Map Instance: {mapInstanceRef.current ? 'yes' : 'no'}</div>
        </div>
      )}
    </div>
  )
}

