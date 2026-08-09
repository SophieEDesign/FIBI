'use client'

import { useEffect, useRef, useState, useMemo } from 'react'
import type { SavedItem } from '@/types/database'
import Link from 'next/link'

type GoogleMapsMap = any
type GoogleMapsMarker = any

interface LibraryMapPreviewProps {
  items: SavedItem[]
}

/**
 * Compact map strip for the places library — markers for items with coordinates.
 */
export default function LibraryMapPreview({ items }: LibraryMapPreviewProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<GoogleMapsMap | null>(null)
  const markersRef = useRef<GoogleMapsMarker[]>([])
  const [isGoogleLoaded, setIsGoogleLoaded] = useState(false)
  const [failed, setFailed] = useState(false)

  const mapped = useMemo(
    () =>
      items.filter(
        (i) =>
          i.latitude != null &&
          i.longitude != null &&
          !Number.isNaN(i.latitude) &&
          !Number.isNaN(i.longitude)
      ),
    [items]
  )
  const mappedKey = mapped.map((i) => i.id).join(',')

  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
    if (!apiKey) {
      setFailed(true)
      return
    }

    const ready = () =>
      !!(
        window.google?.maps?.Map &&
        window.google?.maps?.Marker &&
        window.google?.maps?.LatLngBounds
      )

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
      setTimeout(() => clearInterval(id), 5000)
      return
    }

    const script = document.createElement('script')
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}`
    script.async = true
    script.onload = () => setIsGoogleLoaded(true)
    script.onerror = () => setFailed(true)
    document.head.appendChild(script)
  }, [])

  useEffect(() => {
    if (!isGoogleLoaded || !mapRef.current || mapped.length === 0) return

    const g = window.google.maps as any
    if (!mapInstanceRef.current) {
      mapInstanceRef.current = new g.Map(mapRef.current, {
        zoom: 3,
        center: { lat: mapped[0].latitude!, lng: mapped[0].longitude! },
        disableDefaultUI: true,
        zoomControl: true,
        gestureHandling: 'cooperative',
        styles: [
          { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] },
          { featureType: 'transit', elementType: 'labels', stylers: [{ visibility: 'off' }] },
        ],
      })
    }

    markersRef.current.forEach((m) => m.setMap(null))
    markersRef.current = []

    const bounds = new g.LatLngBounds()
    mapped.forEach((item) => {
      const pos = { lat: item.latitude!, lng: item.longitude! }
      const marker = new g.Marker({
        position: pos,
        map: mapInstanceRef.current,
        title: item.title || item.place_name || undefined,
      })
      markersRef.current.push(marker)
      bounds.extend(pos)
    })

    if (mapped.length === 1) {
      mapInstanceRef.current.setCenter(bounds.getCenter())
      mapInstanceRef.current.setZoom(12)
    } else {
      mapInstanceRef.current.fitBounds(bounds, 48)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isGoogleLoaded, mappedKey])

  if (mapped.length === 0) return null

  if (failed) {
    return (
      <div className="mb-6 rounded-2xl bg-fibi-blue-light/20 border border-gray-100 px-4 py-6 text-center text-sm text-fibi-muted">
        {mapped.length} place{mapped.length === 1 ? '' : 's'} with a pin — open{' '}
        <Link href="/app/map" className="text-fibi-primary hover:underline">
          Map
        </Link>{' '}
        for the full view.
      </div>
    )
  }

  return (
    <div className="mb-6 rounded-2xl overflow-hidden border border-gray-100 shadow-sm bg-white">
      <div ref={mapRef} className="w-full h-48 sm:h-56" />
      <div className="px-4 py-2 border-t border-gray-50 flex items-center justify-between">
        <p className="text-xs text-fibi-muted">
          {mapped.length} on the map
        </p>
        <Link href="/app/map" className="text-xs font-medium text-fibi-primary hover:underline">
          Open map
        </Link>
      </div>
    </div>
  )
}
