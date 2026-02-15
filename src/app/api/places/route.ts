import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const auth = await requireUser(request)
    if (auth instanceof NextResponse) return auth

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
      
      // Extract city and country from address components
      let city: string | null = null
      let country: string | null = null

      if (firstResult.address_components) {
        for (const component of firstResult.address_components) {
          if (component.types.includes('locality') || component.types.includes('administrative_area_level_1')) {
            city = component.long_name
          }
          if (component.types.includes('country')) {
            country = component.long_name
          }
        }
      }

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


