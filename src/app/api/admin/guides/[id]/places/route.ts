import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, getAdminSupabase } from '@/lib/admin'

export const dynamic = 'force-dynamic'

type PlaceInput = {
  id?: string
  name?: string
  description?: string | null
  section?: string | null
  display_order?: number
  latitude?: number | null
  longitude?: number | null
  formatted_address?: string | null
  location_city?: string | null
  location_country?: string | null
  place_id?: string | null
  source_url?: string | null
  source_platform?: string | null
  video_url?: string | null
  image_url?: string | null
}

/**
 * Replace all places for a guide (admin).
 * PUT body: { places: PlaceInput[] }
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin(request)
  if (auth instanceof NextResponse) return auth

  const { id: guideId } = await params
  const body = await request.json().catch(() => ({}))
  const places = Array.isArray(body.places) ? (body.places as PlaceInput[]) : null

  if (!places) {
    return NextResponse.json({ error: 'places array required' }, { status: 400 })
  }

  const admin = getAdminSupabase()

  const { data: guide } = await admin
    .from('travel_guides')
    .select('id')
    .eq('id', guideId)
    .maybeSingle()

  if (!guide) {
    return NextResponse.json({ error: 'Guide not found' }, { status: 404 })
  }

  // Full replace keeps reorder/delete simple for a lightweight editor
  const { error: deleteError } = await admin
    .from('travel_guide_places')
    .delete()
    .eq('guide_id', guideId)

  if (deleteError) {
    console.error('Admin clear places error:', deleteError)
    return NextResponse.json({ error: 'Failed to update places' }, { status: 500 })
  }

  if (places.length === 0) {
    return NextResponse.json({ places: [] })
  }

  const rows = places.map((p, index) => {
    const name = typeof p.name === 'string' ? p.name.trim() : ''
    if (!name) {
      throw new Error('Each place needs a name')
    }
    return {
      guide_id: guideId,
      name,
      description:
        typeof p.description === 'string' ? p.description.trim() || null : null,
      section: typeof p.section === 'string' ? p.section.trim() || null : null,
      display_order:
        typeof p.display_order === 'number' ? p.display_order : index,
      latitude: typeof p.latitude === 'number' ? p.latitude : null,
      longitude: typeof p.longitude === 'number' ? p.longitude : null,
      formatted_address:
        typeof p.formatted_address === 'string'
          ? p.formatted_address.trim() || null
          : null,
      location_city:
        typeof p.location_city === 'string' ? p.location_city.trim() || null : null,
      location_country:
        typeof p.location_country === 'string'
          ? p.location_country.trim() || null
          : null,
      place_id: typeof p.place_id === 'string' ? p.place_id.trim() || null : null,
      source_url:
        typeof p.source_url === 'string' ? p.source_url.trim() || null : null,
      source_platform:
        typeof p.source_platform === 'string'
          ? p.source_platform.trim() || null
          : null,
      video_url: typeof p.video_url === 'string' ? p.video_url.trim() || null : null,
      image_url: typeof p.image_url === 'string' ? p.image_url.trim() || null : null,
    }
  })

  try {
    const { data, error } = await admin
      .from('travel_guide_places')
      .insert(rows)
      .select('*')
      .order('display_order', { ascending: true })

    if (error) {
      console.error('Admin insert places error:', error)
      return NextResponse.json({ error: 'Failed to save places' }, { status: 500 })
    }

    return NextResponse.json({ places: data || [] })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to save places'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
