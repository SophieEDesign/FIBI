import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

/**
 * Get itinerary data by share token (public, no auth required)
 * GET /api/itinerary/share/[token]
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const { token } = params
    const supabase = await createClient()

    if (!token || typeof token !== 'string') {
      return NextResponse.json({ error: 'Invalid token' }, { status: 400 })
    }

    // Find the active (non-revoked) share
    const { data: share, error: shareError } = await supabase
      .from('itinerary_shares')
      .select('itinerary_id, revoked_at')
      .eq('share_token', token)
      .is('revoked_at', null)
      .single()

    if (shareError || !share) {
      return NextResponse.json({ error: 'Share not found or revoked' }, { status: 404 })
    }

    // Get the itinerary (no auth check needed - RLS will allow public read via share)
    const { data: itinerary, error: itineraryError } = await supabase
      .from('itineraries')
      .select('id, name, created_at')
      .eq('id', share.itinerary_id)
      .single()

    if (itineraryError || !itinerary) {
      return NextResponse.json({ error: 'Itinerary not found' }, { status: 404 })
    }

    // Get all items in this itinerary using the database function
    // This function bypasses RLS and only returns items for valid, active shares
    const { data: items, error: itemsError } = await supabase.rpc('get_shared_itinerary_items', {
      share_token_param: token,
    })

    if (itemsError) {
      console.error('Error fetching shared itinerary items:', itemsError)
      return NextResponse.json({ error: 'Failed to fetch items' }, { status: 500 })
    }

    const itemsData = items || []

    return NextResponse.json({
      itinerary: {
        id: itinerary.id,
        name: itinerary.name,
        created_at: itinerary.created_at,
      },
      items: itemsData,
    })
  } catch (error: any) {
    console.error('Error fetching shared itinerary:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * Revoke a share token
 * DELETE /api/itinerary/share/[token]
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { token } = params

    if (!token || typeof token !== 'string') {
      return NextResponse.json({ error: 'Invalid token' }, { status: 400 })
    }

    // Find the share and verify ownership
    const { data: share, error: shareError } = await supabase
      .from('itinerary_shares')
      .select('id, itinerary_id, revoked_at')
      .eq('share_token', token)
      .single()

    if (shareError || !share) {
      return NextResponse.json({ error: 'Share not found' }, { status: 404 })
    }

    if (share.revoked_at) {
      return NextResponse.json({ error: 'Share already revoked' }, { status: 400 })
    }

    // Verify the user owns the itinerary
    const { data: itinerary, error: itineraryError } = await supabase
      .from('itineraries')
      .select('id, user_id')
      .eq('id', share.itinerary_id)
      .eq('user_id', user.id)
      .single()

    if (itineraryError || !itinerary) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Revoke the share
    const { error: revokeError } = await supabase
      .from('itinerary_shares')
      .update({ revoked_at: new Date().toISOString() })
      .eq('id', share.id)

    if (revokeError) {
      console.error('Error revoking share:', revokeError)
      return NextResponse.json({ error: 'Failed to revoke share' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error revoking share:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

