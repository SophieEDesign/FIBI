import { NextRequest, NextResponse } from 'next/server'
import { createClient, createClientWithToken } from '@/lib/supabase/server'
import { randomBytes } from 'crypto'

export const dynamic = 'force-dynamic'

/**
 * Generate a secure, non-guessable share token for an itinerary
 * POST /api/itinerary/share
 * Body: { itinerary_id: string }
 */
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    const supabaseAuth = await createClient(request)
    let user: { id: string } | null = null
    let authError: Error | null = null
    /** Client used for DB queries – cookie-based or token-based so RLS sees the user */
    let supabase = supabaseAuth

    // Try cookie-based auth first (RLS works with cookie client)
    const cookieHeader = request.headers.get('cookie')
    const { data: { user: cookieUser }, error: cookieError } = await supabaseAuth.auth.getUser()

    if (cookieUser && !cookieError) {
      user = cookieUser
      supabase = supabaseAuth
      console.log('Share API - Using cookie-based auth, user:', user.id)
    } else if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.substring(7)
      const { data: { user: tokenUser }, error: tokenError } = await supabaseAuth.auth.getUser(token)
      if (tokenError || !tokenUser) {
        authError = tokenError || new Error('Bearer token validation failed')
        console.error('Share API - Bearer token validation failed:', tokenError)
      } else {
        user = tokenUser
        authError = null
        // Use a client that sends the JWT so RLS (auth.uid()) works on itineraries / itinerary_shares
        supabase = createClientWithToken(token)
        console.log('Share API - Using Bearer token, user:', user.id)
      }
    } else {
      authError = cookieError || new Error('No authentication method available')
    }

    if (!user || authError) {
      console.error('Share API auth error:', authError)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { itinerary_id } = await request.json()

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

    if (!shareCheckError && existingShare) {
      // Get the base URL from request or environment variable
      const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 
                      request.headers.get('origin') || 
                      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')
      // Return existing token
      return NextResponse.json({
        share_token: existingShare.share_token,
        share_url: `${baseUrl}/share/itinerary/${existingShare.share_token}`,
      })
    }

    // Generate a secure, non-guessable token (32 bytes = 64 hex characters)
    const tokenBytes = randomBytes(32)
    const share_token = tokenBytes.toString('hex')

    // Create the share record
    const { data: share, error: shareError } = await supabase
      .from('itinerary_shares')
      .insert({
        itinerary_id,
        share_token,
      })
      .select('share_token')
      .single()

    if (shareError || !share) {
      console.error('Error creating share token:', shareError)
      return NextResponse.json({ error: 'Failed to create share token' }, { status: 500 })
    }

    // Get the base URL from request or environment variable
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 
                    request.headers.get('origin') || 
                    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')
    const share_url = `${baseUrl}/share/itinerary/${share.share_token}`

    return NextResponse.json({
      share_token: share.share_token,
      share_url,
    })
  } catch (error: any) {
    console.error('Error generating share token:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

