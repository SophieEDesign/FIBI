import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, getAdminSupabase } from '@/lib/admin'
import { UUID_REGEX } from '@/lib/utils'
import { sendEmail } from '@/lib/resend'
import {
  ADMIN_WELCOME_EMAIL_SUBJECT,
  getAdminWelcomeEmailHtml,
} from '@/lib/email-templates'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdmin(request)
    if (auth instanceof NextResponse) return auth

    const body = await request.json().catch(() => ({}))
    const userId = typeof body.userId === 'string' ? body.userId.trim() : ''

    if (!userId || !UUID_REGEX.test(userId)) {
      return NextResponse.json(
        { error: 'Valid userId is required' },
        { status: 400 }
      )
    }

    const admin = getAdminSupabase()

    const { data, error: viewError } = await admin.rpc('get_admin_user_overview_by_id', {
      p_user_id: userId,
    })
    const row = data?.[0]

    if (viewError || !row) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 400 }
      )
    }

    if (!row.email) {
      return NextResponse.json(
        { error: 'User has no email' },
        { status: 400 }
      )
    }

    if (row.email_confirmed_at == null || row.welcome_email_sent === true) {
      return NextResponse.json(
        { error: 'User not eligible for welcome email' },
        { status: 400 }
      )
    }

    await sendEmail({
      to: row.email,
      subject: ADMIN_WELCOME_EMAIL_SUBJECT,
      html: getAdminWelcomeEmailHtml(),
    })

    const { error: updateError } = await admin
      .from('profiles')
      .update({ welcome_email_sent: true })
      .eq('id', userId)

    if (updateError) {
      console.error('Failed to set welcome_email_sent:', updateError)
      return NextResponse.json(
        { error: 'Email sent but failed to update record' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    console.error('Send welcome error:', err)
    const message = err instanceof Error ? err.message : 'Internal server error'
    return NextResponse.json(
      { error: message },
      { status: 500 }
    )
  }
}
