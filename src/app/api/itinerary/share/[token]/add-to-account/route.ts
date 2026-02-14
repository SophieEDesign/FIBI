import { NextRequest, NextResponse } from 'next/server'
import { createClient, createClientWithToken } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

/**
 * Copy a shared itinerary (and its items) into the current user's account.
 * POST /api/itinerary/share/[token]/add-to-account
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params

    if (!token || typeof token !== 'string') {
      return NextResponse.json({ error: 'Invalid token' }, { status: 400 })
    }

    // Auth: require user (cookies or Bearer)
    const authHeader = request.headers.get('authorization')
    const supabaseAuth = await createClient(request)
    let user: { id: string } | null = null
    let supabase = supabaseAuth

    const { data: { user: cookieUser }, error: cookieError } = await supabaseAuth.auth.getUser()
    if (cookieUser && !cookieError) {
      user = cookieUser
      supabase = supabaseAuth
    } else if (authHeader?.startsWith('Bearer ')) {
      const accessToken = authHeader.substring(7)
      const { data: { user: tokenUser }, error: tokenError } = await supabaseAuth.auth.getUser(accessToken)
      if (tokenUser && !tokenError) {
        user = tokenUser
        supabase = createClientWithToken(accessToken)
      }
    }

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Resolve share and load itinerary + items (use anon-capable client)
    const anon = await createClient()
    const { data: share, error: shareError } = await anon
      .from('itinerary_shares')
      .select('itinerary_id, revoked_at')
      .eq('share_token', token)
      .is('revoked_at', null)
      .single()

    if (shareError || !share) {
      return NextResponse.json({ error: 'Share not found or revoked' }, { status: 404 })
    }

    const { data: itinerary, error: itineraryError } = await anon
      .from('itineraries')
      .select('id, name, created_at')
      .eq('id', share.itinerary_id)
      .single()

    if (itineraryError || !itinerary) {
      return NextResponse.json({ error: 'Itinerary not found' }, { status: 404 })
    }

    const { data: items, error: itemsError } = await anon.rpc('get_shared_itinerary_items', {
      share_token_param: token,
    })

    if (itemsError) {
      console.error('Error fetching shared itinerary items:', itemsError)
      return NextResponse.json({ error: 'Failed to fetch items' }, { status: 500 })
    }

    const sharedItems = items ?? []

    // Create new itinerary for current user
    const { data: newItinerary, error: insertItineraryError } = await supabase
      .from('itineraries')
      .insert({
        user_id: user.id,
        name: itinerary.name,
      })
      .select('id, name')
      .single()

    if (insertItineraryError || !newItinerary) {
      console.error('Error creating itinerary:', insertItineraryError)
      return NextResponse.json({ error: 'Failed to create itinerary' }, { status: 500 })
    }

    // Copy each item into saved_items for the current user
    if (sharedItems.length > 0) {
      const rows = sharedItems.map((item: Record<string, unknown>) => ({
        user_id: user!.id,
        itinerary_id: newItinerary.id,
        url: item.url,
        platform: item.platform,
        title: item.title ?? null,
        description: item.description ?? null,
        thumbnail_url: item.thumbnail_url ?? null,
        screenshot_url: item.screenshot_url ?? null,
        location_country: item.location_country ?? null,
        location_city: item.location_city ?? null,
        place_name: item.place_name ?? null,
        place_id: item.place_id ?? null,
        latitude: item.latitude ?? null,
        longitude: item.longitude ?? null,
        formatted_address: item.formatted_address ?? null,
        category: item.category ?? null,
        status: item.status ?? null,
        notes: item.notes ?? null,
        planned_date: item.planned_date ?? null,
      }))

      const { error: insertItemsError } = await supabase.from('saved_items').insert(rows)

      if (insertItemsError) {
        console.error('Error copying items:', insertItemsError)
        return NextResponse.json({ error: 'Failed to copy places' }, { status: 500 })
      }
    }

    return NextResponse.json({
      success: true,
      itinerary_id: newItinerary.id,
      name: newItinerary.name,
    })
  } catch (error: unknown) {
    console.error('Error adding shared itinerary to account:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
