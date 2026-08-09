import { NextRequest, NextResponse } from 'next/server'
import { createClient, createClientWithToken } from '@/lib/supabase/server'
import { isAnonymousUser } from '@/lib/anonymous-auth'
import {
  defaultBoardNameFromGuide,
  guidePlaceToSavedItemFields,
} from '@/lib/travel-guides'
import type { TravelGuide, TravelGuidePlace } from '@/types/database'
import type { User } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

/**
 * Copy all places from a published Travel Guide into a new private Travel Board.
 * POST /api/travel-guides/[slug]/save
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
        { error: 'Create an account to save this guide as a Travel Board.' },
        { status: 403 }
      )
    }

    const anon = await createClient()
    const { data: guide, error: guideError } = await anon
      .from('travel_guides')
      .select('*')
      .eq('slug', slug)
      .eq('status', 'published')
      .maybeSingle()

    if (guideError || !guide) {
      return NextResponse.json({ error: 'Travel guide not found' }, { status: 404 })
    }

    const typedGuide = guide as TravelGuide

    const { data: places, error: placesError } = await anon
      .from('travel_guide_places')
      .select('*')
      .eq('guide_id', typedGuide.id)
      .order('display_order', { ascending: true })

    if (placesError) {
      console.error('Guide places error:', placesError)
      return NextResponse.json({ error: 'Failed to load places' }, { status: 500 })
    }

    const guidePlaces = (places || []) as TravelGuidePlace[]

    const { data: newItinerary, error: insertItineraryError } = await supabase
      .from('itineraries')
      .insert({
        user_id: user.id,
        name: defaultBoardNameFromGuide(typedGuide),
        notes: typedGuide.excerpt ?? null,
        cover_image_url: typedGuide.cover_image_url ?? null,
      })
      .select('id, name')
      .single()

    if (insertItineraryError || !newItinerary) {
      console.error('Error creating itinerary from guide:', insertItineraryError)
      return NextResponse.json({ error: 'Failed to create Travel Board' }, { status: 500 })
    }

    if (guidePlaces.length > 0) {
      const rows = guidePlaces.map((place, index) => {
        const fields = guidePlaceToSavedItemFields(place)
        return {
          user_id: user!.id,
          itinerary_id: newItinerary.id,
          ...fields,
          trip_position: index,
        }
      })

      const { error: insertItemsError } = await supabase.from('saved_items').insert(rows)
      if (insertItemsError) {
        console.error('Error copying guide places:', insertItemsError)
        return NextResponse.json({ error: 'Failed to copy places' }, { status: 500 })
      }
    }

    try {
      const { getAdminSupabase } = await import('@/lib/admin')
      await getAdminSupabase().from('travel_guide_saves').insert({
        guide_id: typedGuide.id,
        user_id: user.id,
      })
    } catch (e) {
      console.error('guide save attribution', e)
    }

    return NextResponse.json({
      success: true,
      itinerary_id: newItinerary.id,
      name: newItinerary.name,
    })
  } catch (error: unknown) {
    console.error('Save guide error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
