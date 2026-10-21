/**
 * Resolve a free-text place query to coordinates via /api/places.
 * Used after AI enrich so map pins appear without manual typing.
 */

export type GeocodedPlace = {
  place_name: string
  place_id: string
  latitude: number
  longitude: number
  formatted_address: string
  city: string | null
  country: string | null
}

export function buildLocationSearchQuery(parts: {
  placeName?: string | null
  city?: string | null
  country?: string | null
}): string | null {
  const query = [parts.placeName, parts.city, parts.country]
    .map((p) => (typeof p === 'string' ? p.trim() : ''))
    .filter(Boolean)
    .join(', ')
  return query || null
}

export async function geocodePlaceQuery(
  query: string,
  hints?: { city?: string | null; country?: string | null }
): Promise<GeocodedPlace | null> {
  const trimmed = query.trim()
  if (!trimmed) return null

  try {
    const placesRes = await fetch('/api/places', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: trimmed }),
    })
    if (!placesRes.ok) return null
    const placesData = await placesRes.json()
    if (!placesData.place?.geometry?.location) return null

    const lat = placesData.place.geometry.location.lat
    const lng = placesData.place.geometry.location.lng
    if (typeof lat !== 'number' || typeof lng !== 'number') return null

    return {
      place_name: placesData.place.name || trimmed,
      place_id: placesData.place.place_id,
      latitude: lat,
      longitude: lng,
      formatted_address: placesData.place.formatted_address || '',
      city: hints?.city || placesData.city || null,
      country: hints?.country || placesData.country || null,
    }
  } catch {
    return null
  }
}
