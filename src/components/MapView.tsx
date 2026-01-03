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

        const { data, error } = await supabase
          .from('saved_items')
          .select('*')
          .eq('user_id', user.id)
          .not('latitude', 'is', null)
          .not('longitude', 'is', null)
          .order('created_at', { ascending: false })

        if (error) {
          console.error('Error fetching items:', error)
        } else {
          setItems(data || [])
        }
      } catch (error) {
        console.error('Error fetching items:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchItems()
  }, [supabase, router])

  // Initialize map
  useEffect(() => {
    if (!isGoogleLoaded || !mapRef.current || items.length === 0) return

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

    // Create map
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

    // Clear existing markers
    markersRef.current.forEach(({ marker }) => marker.setMap(null))
    markersRef.current = []

    // Create markers for each item
    const bounds = new window.google.maps.LatLngBounds()

    items.forEach((item) => {
      if (!item.latitude || !item.longitude) return

      const position = new window.google.maps.LatLng(item.latitude, item.longitude)

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
    if (items.length > 0) {
      map.fitBounds(bounds)
      // Add padding
      const padding = 50
      map.padding = {
        top: padding,
        right: padding,
        bottom: padding,
        left: padding,
      }
    }

    // Close preview when clicking on map
    const mapClickListener = map.addListener('click', () => {
      setSelectedItem(null)
      setPreviewPosition(null)
    })

    return () => {
      window.google.maps.event.removeListener(mapClickListener)
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

  if (loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-gray-50">
        <div className="text-gray-600">Loading map...</div>
      </div>
    )
  }

  if (!isGoogleLoaded) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-gray-600 mb-2">Unable to load map</p>
          <p className="text-sm text-gray-500">Google Maps API key may be missing</p>
        </div>
      </div>
    )
  }

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
        <div className="absolute inset-0 flex items-center justify-center bg-gray-50/80 pointer-events-none">
          <div className="text-center bg-white rounded-lg shadow-sm p-6 max-w-sm">
            <p className="text-gray-600 mb-2">No places with locations yet</p>
            <p className="text-sm text-gray-500">
              Add locations to your saved places to see them on the map
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

