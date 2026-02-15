import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin'
import { sendEmail } from '@/lib/resend'

/**
 * API route for sending emails via Resend.
 * Restricted to admin only to prevent spam/phishing abuse.
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
    const auth = await requireAdmin(request)
    if (auth instanceof NextResponse) return auth

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

