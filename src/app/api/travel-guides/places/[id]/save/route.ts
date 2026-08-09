import { NextRequest, NextResponse } from 'next/server'
import { createClient, createClientWithToken } from '@/lib/supabase/server'
import { isAnonymousUser } from '@/lib/anonymous-auth'
import { guidePlaceToSavedItemFields } from '@/lib/travel-guides'
import { persistAndUpdateItemThumbnail } from '@/lib/persist-thumbnail'
import type { TravelGuidePlace } from '@/types/database'
import type { User } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

async function requireSignedInUser(request: NextRequest): Promise<
  | { user: User; supabase: Awaited<ReturnType<typeof createClient>> }
  | NextResponse
> {
  const authHeader = request.headers.get('authorization')
  const supabaseAuth = await createClient(request)
  let user: User | null = null
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
  if (isAnonymousUser(user)) {
    return NextResponse.json(
      { error: 'Create an account to keep this place in FIBI.' },
      { status: 403 }
    )
  }

  return { user, supabase }
}

/**
 * Save one guide place into the user's private saved_items.
 * POST /api/travel-guides/places/[id]/save
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    if (!id) {
      return NextResponse.json({ error: 'Invalid place' }, { status: 400 })
    }

    const auth = await requireSignedInUser(request)
    if (auth instanceof NextResponse) return auth
    const { user, supabase } = auth

    // Public client can only read published guide places (RLS)
    const anon = await createClient()
    const { data: place, error: placeError } = await anon
      .from('travel_guide_places')
      .select('*')
      .eq('id', id)
      .maybeSingle()

    if (placeError || !place) {
      return NextResponse.json({ error: 'Place not found' }, { status: 404 })
    }

    const guidePlace = place as TravelGuidePlace
    const fields = guidePlaceToSavedItemFields(guidePlace)

    // Dedupe by place_id or source url
    if (fields.place_id) {
      const { data: existing } = await supabase
        .from('saved_items')
        .select('id')
        .eq('user_id', user.id)
        .eq('place_id', fields.place_id)
        .limit(1)
        .maybeSingle()
      if (existing) {
        return NextResponse.json({
          success: true,
          duplicate: true,
          saved_item_id: existing.id,
        })
      }
    }

    const { data: byUrl } = await supabase
      .from('saved_items')
      .select('id')
      .eq('user_id', user.id)
      .eq('url', fields.url)
      .limit(1)
      .maybeSingle()

    if (byUrl) {
      return NextResponse.json({
        success: true,
        duplicate: true,
        saved_item_id: byUrl.id,
      })
    }

    const { data: inserted, error: insertError } = await supabase
      .from('saved_items')
      .insert({
        user_id: user.id,
        ...fields,
        itinerary_id: null,
        trip_position: null,
      })
      .select('id')
      .single()

    if (insertError || !inserted) {
      console.error('Save guide place error:', insertError)
      return NextResponse.json({ error: 'Failed to save place' }, { status: 500 })
    }

    // Rehost guide place image so previews stay stable
    if (fields.thumbnail_url) {
      void persistAndUpdateItemThumbnail(supabase, {
        userId: user.id,
        itemId: inserted.id,
        imageUrl: fields.thumbnail_url,
      })
    }

    return NextResponse.json({
      success: true,
      saved_item_id: inserted.id,
    })
  } catch (error: unknown) {
    console.error('Save guide place error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
