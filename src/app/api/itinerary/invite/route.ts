import { NextRequest, NextResponse } from 'next/server'
import { createClient, createClientWithToken } from '@/lib/supabase/server'
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
    const authHeader = request.headers.get('authorization')
    const supabaseAuth = await createClient(request)
    let user: { id: string; email?: string } | null = null
    let supabase = supabaseAuth

    const { data: { user: cookieUser }, error: cookieError } = await supabaseAuth.auth.getUser()
    if (cookieUser && !cookieError) {
      user = cookieUser
    } else if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.substring(7)
      const { data: { user: tokenUser }, error: tokenError } = await supabaseAuth.auth.getUser(token)
      if (tokenUser && !tokenError) {
        user = tokenUser
        supabase = createClientWithToken(token)
      }
    }

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const itinerary_id = body?.itinerary_id
    const recipientEmailRaw = typeof body?.recipientEmail === 'string' ? body.recipientEmail.trim() : ''
    const recipientEmail = recipientEmailRaw || undefined
    const recipientName = body?.recipientName
    const itineraryName = body?.itineraryName
    const share_type = body?.share_type === 'collaborate' ? 'collaborate' : 'copy'

    if (!itinerary_id || typeof itinerary_id !== 'string') {
      return NextResponse.json({ error: 'itinerary_id is required' }, { status: 400 })
    }

    if (!recipientEmail) {
      return NextResponse.json({ error: 'recipientEmail is required' }, { status: 400 })
    }

    // Basic email validation (Resend requires email@example.com or "Name <email@example.com>")
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

    // Get or create share token (with share_type)
    const { data: existingShare, error: shareCheckError } = await supabase
      .from('itinerary_shares')
      .select('id, share_token')
      .eq('itinerary_id', itinerary_id)
      .is('revoked_at', null)
      .maybeSingle()

    let shareToken: string
    if (!shareCheckError && existingShare) {
      shareToken = existingShare.share_token
      await supabase
        .from('itinerary_shares')
        .update({ share_type })
        .eq('id', existingShare.id)
    } else {
      const { randomBytes } = await import('crypto')
      const tokenBytes = randomBytes(32)
      shareToken = tokenBytes.toString('hex')

      const { error: shareError } = await supabase
        .from('itinerary_shares')
        .insert({
          itinerary_id,
          share_token: shareToken,
          share_type,
        })

      if (shareError) {
        console.error('Error creating share token:', shareError)
        return NextResponse.json({ error: 'Failed to create share token' }, { status: 500 })
      }
    }

    // For collaborate, add recipient as invited collaborator
    if (share_type === 'collaborate') {
      const { error: collabError } = await supabase.from('itinerary_collaborators').insert({
        itinerary_id,
        invited_email: recipientEmail.toLowerCase(),
        invited_by: user.id,
      })
      if (collabError && collabError.code !== '23505') {
        console.error('Error creating collaborator invite:', collabError)
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
        shareType: share_type,
      })

      return NextResponse.json({
        success: true,
        message: 'Invite email sent successfully',
      })
    } catch (emailError: any) {
      console.error('Error sending invite email:', emailError)
      const message = emailError?.message || ''
      // Don't expose env var names to the client; show a friendly message when email isn't configured
      if (message.includes('RESEND_API_KEY') || message.includes('not set')) {
        return NextResponse.json(
          { error: 'Email is not configured. Copy the share link above to send it yourself, or ask the site owner to set RESEND_API_KEY.' },
          { status: 503 }
        )
      }
      return NextResponse.json(
        { error: 'Failed to send email: ' + (message || 'Unknown error') },
        { status: 500 }
      )
    }
  } catch (error: any) {
    console.error('Error sending invite:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

