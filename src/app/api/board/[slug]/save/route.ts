import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth'
import { isAnonymousUser } from '@/lib/anonymous-auth'
import { deriveLocationStatus } from '@/lib/location-status'
import { persistAndUpdateItemThumbnail } from '@/lib/persist-thumbnail'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

/**
 * Copy a shareable travel board into the current user's account.
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

    const auth = await requireUser(request)
    if (auth instanceof NextResponse) return auth
    const { user, supabase } = auth
    if (isAnonymousUser(user)) {
      return NextResponse.json(
        { error: 'Create an account to add this board to FIBI.' },
        { status: 403 }
      )
    }

    const anon = await createClient()
    const { data: boards, error: boardError } = await anon.rpc('get_published_board', {
      slug_param: slug,
    })

    if (boardError || !boards?.length) {
      return NextResponse.json({ error: 'Travel board not found' }, { status: 404 })
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
        notes: board.public_description ?? null,
        cover_image_url: board.cover_image_url ?? null,
      })
      .select('id, name')
      .single()

    if (insertItineraryError || !newItinerary) {
      console.error('Error creating itinerary:', insertItineraryError)
      return NextResponse.json({ error: 'Failed to create board' }, { status: 500 })
    }

    if (sharedItems.length > 0) {
      const rows = sharedItems.map((item: Record<string, unknown>, index: number) => {
        const lat = (item.latitude as number | null) ?? null
        const lng = (item.longitude as number | null) ?? null
        return {
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
          latitude: lat,
          longitude: lng,
          formatted_address: item.formatted_address ?? null,
          category: item.category ?? null,
          notes: null,
          trip_position: (item.trip_position as number | null) ?? index,
          liked: false,
          visited: false,
          planned: false,
          location_status: deriveLocationStatus({
            latitude: lat,
            longitude: lng,
            place_id: (item.place_id as string | null) ?? null,
            place_name: (item.place_name as string | null) ?? null,
            location_city: (item.location_city as string | null) ?? null,
            location_country: (item.location_country as string | null) ?? null,
            formatted_address: (item.formatted_address as string | null) ?? null,
          }),
        }
      })

      const { data: insertedItems, error: insertItemsError } = await supabase
        .from('saved_items')
        .insert(rows)
        .select('id, thumbnail_url')

      if (insertItemsError) {
        console.error('Error copying items:', insertItemsError)
        return NextResponse.json({ error: 'Failed to copy places' }, { status: 500 })
      }

      // Rehost thumbs in the background (do not block the response)
      if (insertedItems?.length) {
        void Promise.all(
          insertedItems
            .filter((row) => row.thumbnail_url)
            .map((row) =>
              persistAndUpdateItemThumbnail(supabase, {
                userId: user!.id,
                itemId: row.id,
                imageUrl: row.thumbnail_url as string,
              })
            )
        )
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
