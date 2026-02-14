import { NextRequest, NextResponse } from 'next/server'
import { createClient, createClientWithToken } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

/**
 * Join an itinerary as a collaborator (authenticated user)
 * POST /api/itinerary/share/[token]/join-collaborator
 * Returns { success, itinerary_id, redirect_url }
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

    const authHeader = request.headers.get('authorization')
    const supabaseAuth = await createClient(request)
    let user: { id: string; email?: string } | null = null
    let supabase = supabaseAuth

    const { data: { user: cookieUser }, error: cookieError } = await supabaseAuth.auth.getUser()
    if (cookieUser && !cookieError) {
      user = cookieUser
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

    const { data: share, error: shareError } = await supabase
      .from('itinerary_shares')
      .select('id, itinerary_id, share_type')
      .eq('share_token', token)
      .is('revoked_at', null)
      .single()

    if (shareError || !share) {
      return NextResponse.json({ error: 'Share not found or revoked' }, { status: 404 })
    }

    if (share.share_type !== 'collaborate') {
      return NextResponse.json({ error: 'This share is not a collaboration link' }, { status: 400 })
    }

    const { data: itinerary } = await supabase
      .from('itineraries')
      .select('user_id')
      .eq('id', share.itinerary_id)
      .single()

    const ownerId = itinerary?.user_id
    if (!ownerId) {
      return NextResponse.json({ error: 'Itinerary not found' }, { status: 404 })
    }

    const userEmail = (user.email || '').toLowerCase().trim()

    if (userEmail) {
      const { data: existing } = await supabase
        .from('itinerary_collaborators')
        .select('id')
        .eq('itinerary_id', share.itinerary_id)
        .eq('invited_email', userEmail)
        .is('user_id', null)
        .maybeSingle()

      if (existing) {
        const { error: updateError } = await supabase
          .from('itinerary_collaborators')
          .update({ user_id: user.id, joined_at: new Date().toISOString() })
          .eq('id', existing.id)

        if (updateError) {
          console.error('Error updating collaborator:', updateError)
          return NextResponse.json({ error: 'Failed to join' }, { status: 500 })
        }
      } else {
        const { error: insertError } = await supabase
          .from('itinerary_collaborators')
          .insert({
            itinerary_id: share.itinerary_id,
            user_id: user.id,
            invited_by: ownerId,
            joined_at: new Date().toISOString(),
          })
        if (insertError) {
          if (insertError.code === '23503') {
            return NextResponse.json({ error: 'Invalid itinerary' }, { status: 400 })
          }
          if (insertError.code === '23505') {
            return NextResponse.json({ success: true, itinerary_id: share.itinerary_id, already_joined: true })
          }
          console.error('Error inserting collaborator:', insertError)
          return NextResponse.json({ error: 'Failed to join' }, { status: 500 })
        }
      }
    } else {
      const { error: insertError } = await supabase
        .from('itinerary_collaborators')
        .insert({
          itinerary_id: share.itinerary_id,
          user_id: user.id,
          invited_by: ownerId,
          joined_at: new Date().toISOString(),
        })
      if (insertError) {
        if (insertError.code === '23505') {
          return NextResponse.json({ success: true, itinerary_id: share.itinerary_id, already_joined: true })
        }
        console.error('Error inserting collaborator:', insertError)
        return NextResponse.json({ error: 'Failed to join' }, { status: 500 })
      }
    }

    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ||
      request.headers.get('origin') ||
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')
    const redirect_url = `${baseUrl}/app/calendar?itinerary_id=${share.itinerary_id}`

    return NextResponse.json({
      success: true,
      itinerary_id: share.itinerary_id,
      redirect_url,
    })
  } catch (error: any) {
    console.error('Join collaborator error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
