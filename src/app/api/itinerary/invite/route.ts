import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendInviteEmail } from '@/lib/email-templates'

export const dynamic = 'force-dynamic'

/**
 * Send an invite email for an itinerary
 * POST /api/itinerary/invite
 * Body: { 
 *   itinerary_id: string,
 *   recipientEmail: string,
 *   recipientName?: string,
 *   itineraryName?: string
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient(request)
    
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (!user || authError) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { itinerary_id, recipientEmail, recipientName, itineraryName } = await request.json()

    if (!itinerary_id || typeof itinerary_id !== 'string') {
      return NextResponse.json({ error: 'itinerary_id is required' }, { status: 400 })
    }

    if (!recipientEmail || typeof recipientEmail !== 'string') {
      return NextResponse.json({ error: 'recipientEmail is required' }, { status: 400 })
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(recipientEmail)) {
      return NextResponse.json({ error: 'Invalid email address' }, { status: 400 })
    }

    // Verify the itinerary exists and belongs to the user
    const { data: itinerary, error: itineraryError } = await supabase
      .from('itineraries')
      .select('id, user_id, name')
      .eq('id', itinerary_id)
      .eq('user_id', user.id)
      .single()

    if (itineraryError || !itinerary) {
      return NextResponse.json({ error: 'Itinerary not found' }, { status: 404 })
    }

    // Get or create share token
    const { data: existingShare, error: shareCheckError } = await supabase
      .from('itinerary_shares')
      .select('id, share_token')
      .eq('itinerary_id', itinerary_id)
      .is('revoked_at', null)
      .maybeSingle()

    let shareToken: string
    if (!shareCheckError && existingShare) {
      shareToken = existingShare.share_token
    } else {
      // Generate a new share token if one doesn't exist
      const { randomBytes } = await import('crypto')
      const tokenBytes = randomBytes(32)
      shareToken = tokenBytes.toString('hex')

      const { error: shareError } = await supabase
        .from('itinerary_shares')
        .insert({
          itinerary_id,
          share_token: shareToken,
        })

      if (shareError) {
        console.error('Error creating share token:', shareError)
        return NextResponse.json({ error: 'Failed to create share token' }, { status: 500 })
      }
    }

    // Get the base URL
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 
                    request.headers.get('origin') || 
                    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')
    const shareUrl = `${baseUrl}/share/itinerary/${shareToken}`

    // Get sender name from user profile (if profiles table exists)
    let senderName = user.email?.split('@')[0] || 'A friend'
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .maybeSingle()
      
      if (profile?.full_name) {
        senderName = profile.full_name
      }
    } catch (error) {
      // Profiles table might not exist, use email fallback
      console.log('Could not fetch profile, using email as sender name')
    }

    // Send the invite email
    try {
      await sendInviteEmail({
        to: recipientEmail,
        recipientName,
        senderName,
        itineraryName: itineraryName || itinerary.name || 'an itinerary',
        shareUrl,
      })

      return NextResponse.json({
        success: true,
        message: 'Invite email sent successfully',
      })
    } catch (emailError: any) {
      console.error('Error sending invite email:', emailError)
      return NextResponse.json(
        { error: 'Failed to send email: ' + (emailError.message || 'Unknown error') },
        { status: 500 }
      )
    }
  } catch (error: any) {
    console.error('Error sending invite:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

