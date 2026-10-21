import { NextRequest, NextResponse } from 'next/server'
import { allowEnrichAccess } from '@/lib/auth'

export const dynamic = 'force-dynamic'

/** Pull city/country from Place Details-style components or a formatted address string. */
function extractCityCountry(result: {
  address_components?: Array<{ long_name: string; types: string[] }>
  formatted_address?: string
}): { city: string | null; country: string | null } {
  let city: string | null = null
  let country: string | null = null

  if (result.address_components?.length) {
    for (const component of result.address_components) {
      if (
        !city &&
        (component.types.includes('locality') ||
          component.types.includes('postal_town') ||
          component.types.includes('administrative_area_level_1'))
      ) {
        city = component.long_name
      }
      if (!country && component.types.includes('country')) {
        country = component.long_name
      }
    }
  }

  // Text Search usually only returns formatted_address — take last two comma parts
  if ((!city || !country) && result.formatted_address) {
    const parts = result.formatted_address
      .split(',')
      .map((p: string) => p.trim())
      .filter(Boolean)
    if (parts.length >= 2) {
      if (!country) country = parts[parts.length - 1].replace(/\d+/g, '').trim() || parts[parts.length - 1]
      if (!city) city = parts[parts.length - 2].replace(/\d+/g, '').trim() || parts[parts.length - 2]
    } else if (parts.length === 1 && !city) {
      city = parts[0]
    }
  }

  return { city, country }
}

export async function POST(request: NextRequest) {
  try {
    const access = await allowEnrichAccess(request)
    if (access instanceof NextResponse) return access

    const { query } = await request.json()

    if (!query || typeof query !== 'string' || !query.trim()) {
      return NextResponse.json(
        { error: 'Query is required' },
        { status: 400 }
      )
    }

    const apiKey = process.env.GOOGLE_PLACES_API_KEY

    if (!apiKey) {
      // Return empty result if API key is not configured (non-blocking)
      return NextResponse.json({
        place: null,
        city: null,
        country: null,
      })
    }

    // Use Google Places Text Search API
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query.trim())}&key=${apiKey}`
    )

    if (!response.ok) {
      console.warn('Google Places API request failed:', response.status)
      return NextResponse.json({
        place: null,
        city: null,
        country: null,
      })
    }

    const data = await response.json()

    // Only return if we have a confident result
    if (data.status === 'OK' && data.results && data.results.length > 0) {
      const firstResult = data.results[0]

      // Text Search rarely includes address_components — parse formatted_address too
      const { city, country } = extractCityCountry(firstResult)

      return NextResponse.json({
        place: {
          place_id: firstResult.place_id,
          name: firstResult.name,
          formatted_address: firstResult.formatted_address,
          geometry: {
            location: {
              lat: firstResult.geometry.location.lat,
              lng: firstResult.geometry.location.lng,
            },
          },
          address_components: firstResult.address_components || [],
        },
        city,
        country,
      })
    }

    return NextResponse.json({
      place: null,
      city: null,
      country: null,
    })
  } catch (error: any) {
    console.warn('Error searching Google Places:', error)
    // Return empty result on error (non-blocking)
    return NextResponse.json({
      place: null,
      city: null,
      country: null,
    })
  }
}


