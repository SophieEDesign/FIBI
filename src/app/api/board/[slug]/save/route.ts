import { NextRequest, NextResponse } from 'next/server'
import { createClient, createClientWithToken } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

/**
 * Copy a published trip board into the current user's account.
 * POST /api/board/[slug]/save
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params
    if (!slug) {
      return NextResponse.json({ error: 'Invalid slug' }, { status: 400 })
    }

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
      const { data: { user: tokenUser }, error: tokenError } =
        await supabaseAuth.auth.getUser(accessToken)
      if (tokenUser && !tokenError) {
        user = tokenUser
        supabase = createClientWithToken(accessToken)
      }
    }

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const anon = await createClient()
    const { data: boards, error: boardError } = await anon.rpc('get_published_board', {
      slug_param: slug,
    })

    if (boardError || !boards?.length) {
      return NextResponse.json({ error: 'Trip board not found' }, { status: 404 })
    }

    const board = boards[0]

    const { data: items, error: itemsError } = await anon.rpc('get_published_board_items', {
      slug_param: slug,
    })

    if (itemsError) {
      console.error('Board items error:', itemsError)
      return NextResponse.json({ error: 'Failed to load places' }, { status: 500 })
    }

    const sharedItems = items ?? []

    const { data: newItinerary, error: insertItineraryError } = await supabase
      .from('itineraries')
      .insert({
        user_id: user.id,
        name: board.name,
        notes: board.notes ?? null,
        cover_image_url: board.cover_image_url ?? null,
      })
      .select('id, name')
      .single()

    if (insertItineraryError || !newItinerary) {
      console.error('Error creating itinerary:', insertItineraryError)
      return NextResponse.json({ error: 'Failed to create trip' }, { status: 500 })
    }

    if (sharedItems.length > 0) {
      const rows = sharedItems.map((item: Record<string, unknown>, index: number) => ({
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
        trip_position: item.trip_position ?? index,
        liked: false,
        visited: false,
        planned: false,
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
    console.error('Save board error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
