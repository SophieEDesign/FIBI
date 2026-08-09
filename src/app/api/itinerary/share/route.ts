import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth'
import { randomBytes } from 'crypto'
import { isAnonymousUser } from '@/lib/anonymous-auth'

export const dynamic = 'force-dynamic'

/**
 * Generate a secure, non-guessable share token for an itinerary
 * POST /api/itinerary/share
 * Body: { itinerary_id: string }
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await requireUser(request)
    if (auth instanceof NextResponse) return auth
    const { user, supabase } = auth

    if (isAnonymousUser(user)) {
      return NextResponse.json(
        { error: 'Create an account to share a trip.' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const itinerary_id = body?.itinerary_id
    const share_type = body?.share_type === 'collaborate' ? 'collaborate' : 'copy'
    const invite_email = typeof body?.invite_email === 'string' ? body.invite_email.trim() || null : null

    if (!itinerary_id || typeof itinerary_id !== 'string') {
      return NextResponse.json({ error: 'itinerary_id is required' }, { status: 400 })
    }

    // First, let's check what itineraries the user has access to (for debugging)
    const { data: allItineraries, error: listError } = await supabase
      .from('itineraries')
      .select('id, user_id, name')
      .eq('user_id', user.id)
    
    console.log('Share API - User itineraries:', {
      count: allItineraries?.length || 0,
      itineraryIds: allItineraries?.map(i => i.id) || [],
      listError: listError?.message,
    })

    // Verify the itinerary exists and belongs to the user
    const { data: itinerary, error: itineraryError } = await supabase
      .from('itineraries')
      .select('id, user_id')
      .eq('id', itinerary_id)
      .eq('user_id', user.id)
      .single()

    console.log('Share API - Itinerary lookup:', {
      itineraryId: itinerary_id,
      userId: user.id,
      found: !!itinerary,
      error: itineraryError?.message,
      errorCode: itineraryError?.code,
      errorDetails: itineraryError,
    })

    if (itineraryError || !itinerary) {
      console.error('Share API - Itinerary not found:', {
        itineraryId: itinerary_id,
        userId: user.id,
        error: itineraryError,
        availableItineraries: allItineraries?.map(i => ({ id: i.id, name: i.name })) || [],
      })
      return NextResponse.json({ 
        error: 'Itinerary not found',
        details: itineraryError?.message || 'Itinerary does not exist or you do not have access to it'
      }, { status: 404 })
    }

    // Check if a share token already exists for this itinerary
    const { data: existingShare, error: shareCheckError } = await supabase
      .from('itinerary_shares')
      .select('id, share_token')
      .eq('itinerary_id', itinerary_id)
      .is('revoked_at', null)
      .maybeSingle()

    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ||
      request.headers.get('origin') ||
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')

    if (!shareCheckError && existingShare) {
      // Optionally update share_type so the link reflects the latest choice
      await supabase
        .from('itinerary_shares')
        .update({ share_type })
        .eq('id', existingShare.id)
      return NextResponse.json({
        share_token: existingShare.share_token,
        share_url: `${baseUrl}/share/itinerary/${existingShare.share_token}`,
        share_type,
      })
    }

    // Generate a secure, non-guessable token (32 bytes = 64 hex characters)
    const tokenBytes = randomBytes(32)
    const share_token = tokenBytes.toString('hex')

    // Create the share record with share_type
    const { data: share, error: shareError } = await supabase
      .from('itinerary_shares')
      .insert({
        itinerary_id,
        share_token,
        share_type,
      })
      .select('share_token')
      .single()

    if (shareError || !share) {
      console.error('Error creating share token:', shareError)
      return NextResponse.json({ error: 'Failed to create share token' }, { status: 500 })
    }

    // If collaborate and invite_email provided, create collaborator invite
    if (share_type === 'collaborate' && invite_email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (emailRegex.test(invite_email)) {
        const { error: collabError } = await supabase.from('itinerary_collaborators').insert({
          itinerary_id,
          invited_email: invite_email.toLowerCase(),
          invited_by: user.id,
        })
        if (collabError && collabError.code !== '23505') {
          console.error('Error creating collaborator invite:', collabError)
        }
      }
    }

    const share_url = `${baseUrl}/share/itinerary/${share.share_token}`

    return NextResponse.json({
      share_token: share.share_token,
      share_url,
      share_type,
    })
  } catch (error: any) {
    console.error('Error generating share token:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

