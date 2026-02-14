import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, getAdminSupabase } from '@/lib/admin'
import { UUID_REGEX } from '@/lib/utils'
import { sendEmail } from '@/lib/resend'
import {
  NUDGE_FIRST_PLACE_SUBJECT,
  NUDGE_NICE_START_SUBJECT,
  getNudgeFirstPlaceEmailHtml,
  getNudgeNiceStartEmailHtml,
} from '@/lib/email-templates'

const NUDGE_ELIGIBLE_AGE_MS = 48 * 60 * 60 * 1000

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

    if (row.email_confirmed_at == null) {
      return NextResponse.json(
        { error: 'User has not confirmed email' },
        { status: 400 }
      )
    }

    if (row.onboarding_nudge_sent === true) {
      return NextResponse.json(
        { error: 'Onboarding nudge already sent' },
        { status: 400 }
      )
    }

    const createdAt = row.created_at ? new Date(row.created_at).getTime() : 0
    const cutoff = Date.now() - NUDGE_ELIGIBLE_AGE_MS
    if (createdAt >= cutoff) {
      return NextResponse.json(
        { error: 'User must be at least 48 hours old to receive nudge' },
        { status: 400 }
      )
    }

    const placesCount = typeof row.places_count === 'number' ? row.places_count : 0

    if (placesCount === 0) {
      await sendEmail({
        to: row.email,
        subject: NUDGE_FIRST_PLACE_SUBJECT,
        html: getNudgeFirstPlaceEmailHtml(),
      })
    } else {
      await sendEmail({
        to: row.email,
        subject: NUDGE_NICE_START_SUBJECT,
        html: getNudgeNiceStartEmailHtml(),
      })
    }

    const { error: updateError } = await admin
      .from('profiles')
      .update({ onboarding_nudge_sent: true })
      .eq('id', userId)

    if (updateError) {
      console.error('Failed to set onboarding_nudge_sent:', updateError)
      return NextResponse.json(
        { error: 'Email sent but failed to update record' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    console.error('Send onboarding nudge error:', err)
    const message = err instanceof Error ? err.message : 'Internal server error'
    return NextResponse.json(
      { error: message },
      { status: 500 }
    )
  }
}
