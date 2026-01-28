import { NextRequest, NextResponse } from 'next/server'
import { sendEmail } from '@/lib/resend'
import { createClient } from '@/lib/supabase/server'

/**
 * Example API route for sending emails via Resend
 * 
 * POST /api/email
 * Body: {
 *   to: string | string[],
 *   subject: string,
 *   html: string,
 *   from?: string,
 *   replyTo?: string
 * }
 */
export async function POST(request: NextRequest) {
  try {
    // Optional: Verify user is authenticated
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { to, subject, html, from, replyTo } = body

    if (!to || !subject || !html) {
      return NextResponse.json(
        { error: 'Missing required fields: to, subject, html' },
        { status: 400 }
      )
    }

    const result = await sendEmail({
      to,
      subject,
      html,
      from,
      replyTo,
    })

    return NextResponse.json({
      success: true,
      messageId: result?.id,
    })
  } catch (error: any) {
    console.error('Email API error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to send email' },
      { status: 500 }
    )
  }
}

