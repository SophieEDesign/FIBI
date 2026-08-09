'use client'

import { useEffect, useMemo, useRef } from 'react'
import type { TravelGuidePlace } from '@/types/database'

interface GuideMapProps {
  places: TravelGuidePlace[]
  selectedPlaceId: string | null
  onSelectPlace: (id: string | null) => void
  className?: string
}

export default function GuideMap({
  places,
  selectedPlaceId,
  onSelectPlace,
  className = '',
}: GuideMapProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<any>(null)
  const markersRef = useRef<Map<string, any>>(new Map())
  const loadedRef = useRef(false)

  const mapped = useMemo(
    () =>
      places.filter(
        (p) =>
          p.latitude != null &&
          p.longitude != null &&
          !Number.isNaN(Number(p.latitude)) &&
          !Number.isNaN(Number(p.longitude))
      ),
    [places]
  )

  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
    if (!apiKey || mapped.length === 0) return

    const ready = () => !!(window.google?.maps?.Map && window.google?.maps?.Marker)

    const init = () => {
      if (!mapRef.current || loadedRef.current) return
      loadedRef.current = true
      const g = window.google.maps as any
      const map = new g.Map(mapRef.current, {
        zoom: 12,
        center: {
          lat: Number(mapped[0].latitude),
          lng: Number(mapped[0].longitude),
        },
        disableDefaultUI: true,
        zoomControl: true,
        styles: [
          { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] },
        ],
      })
      mapInstanceRef.current = map

      const bounds = new g.LatLngBounds()
      markersRef.current.clear()

      mapped.forEach((place) => {
        const pos = { lat: Number(place.latitude), lng: Number(place.longitude) }
        const marker = new g.Marker({
          position: pos,
          map,
          title: place.name,
        })
        marker.addListener('click', () => onSelectPlace(place.id))
        markersRef.current.set(place.id, marker)
        bounds.extend(pos)
      })

      if (mapped.length > 1) map.fitBounds(bounds, 48)
    }

    if (ready()) {
      init()
      return
    }

    const existing = document.querySelector('script[src*="maps.googleapis.com"]')
    if (existing) {
      const id = setInterval(() => {
        if (ready()) {
          clearInterval(id)
          init()
        }
      }, 50)
      return () => clearInterval(id)
    }

    const script = document.createElement('script')
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}`
    script.async = true
    script.onload = () => init()
    document.head.appendChild(script)
  }, [mapped, onSelectPlace])

  useEffect(() => {
    if (!selectedPlaceId || !mapInstanceRef.current) return
    const place = mapped.find((p) => p.id === selectedPlaceId)
    if (!place) return
    mapInstanceRef.current.panTo({
      lat: Number(place.latitude),
      lng: Number(place.longitude),
    })
    const zoom = mapInstanceRef.current.getZoom?.() || 12
    mapInstanceRef.current.setZoom(Math.max(zoom, 14))
  }, [selectedPlaceId, mapped])

  if (mapped.length === 0) {
    return null
  }

  return (
    <div
      ref={mapRef}
      data-guide-map
      className={`w-full h-72 sm:h-[28rem] bg-[color:var(--bg-inset)] ${className}`}
      role="img"
      aria-label="Map of places in this guide"
    />
  )
}
