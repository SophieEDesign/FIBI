import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { randomBytes } from 'crypto'

export const dynamic = 'force-dynamic'

/**
 * Generate a secure, non-guessable share token for an itinerary
 * POST /api/itinerary/share
 * Body: { itinerary_id: string }
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient(request)
    
    // Use getUser() which is more reliable for API routes
    // It validates the session and refreshes if needed
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (!user || authError) {
      console.error('Share API auth error:', authError)
      console.error('Request cookies:', request.headers.get('cookie')?.substring(0, 100))
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { itinerary_id } = await request.json()

    if (!itinerary_id || typeof itinerary_id !== 'string') {
      return NextResponse.json({ error: 'itinerary_id is required' }, { status: 400 })
    }

    // Verify the itinerary exists and belongs to the user
    const { data: itinerary, error: itineraryError } = await supabase
      .from('itineraries')
      .select('id, user_id')
      .eq('id', itinerary_id)
      .eq('user_id', user.id)
      .single()

    if (itineraryError || !itinerary) {
      return NextResponse.json({ error: 'Itinerary not found' }, { status: 404 })
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

