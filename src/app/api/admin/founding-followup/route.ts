import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, getAdminSupabase } from '@/lib/admin'
import { sendEmail } from '@/lib/resend'
import {
  FOUNDING_FOLLOWUP_EMAIL_SUBJECT,
  getFoundingFollowupEmailHtml,
} from '@/lib/email-templates'

const DELAY_BETWEEN_SENDS_MS = 800

export const dynamic = 'force-dynamic'

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * GET: Return count and list of users eligible for founding follow-up.
 * Admin only.
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdmin(request)
    if (auth instanceof NextResponse) return auth

    const admin = getAdminSupabase()

    const { data: rows, error } = await admin
      .from('admin_user_overview')
      .select('id, email')
      .not('email_confirmed_at', 'is', null)
      .eq('founding_followup_sent', false)

    if (error) {
      console.error('Founding follow-up eligible fetch error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch eligible users' },
        { status: 500 }
      )
    }

    const users = (rows || []).filter((r) => r.email)
    return NextResponse.json({ count: users.length, users })
  } catch (err: unknown) {
    console.error('Founding follow-up GET error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST: Send founding follow-up to all eligible users.
 * Fetches eligible list, sends with rate-limit delay, updates founding_followup_sent on success.
 * Returns { sent, failed, errors }.
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdmin(request)
    if (auth instanceof NextResponse) return auth

    const admin = getAdminSupabase()

    const { data: rows, error: fetchError } = await admin
      .from('admin_user_overview')
      .select('id, email')
      .not('email_confirmed_at', 'is', null)
      .eq('founding_followup_sent', false)

    if (fetchError) {
      console.error('Founding follow-up POST fetch error:', fetchError)
      return NextResponse.json(
        { error: 'Failed to fetch eligible users' },
        { status: 500 }
      )
    }

    const eligible = (rows || []).filter((r) => r.email) as { id: string; email: string }[]
    const html = getFoundingFollowupEmailHtml()
    let sent = 0
    let failed = 0
    const errors: string[] = []

    for (let i = 0; i < eligible.length; i++) {
      const user = eligible[i]
      try {
        await sendEmail({
          to: user.email,
          subject: FOUNDING_FOLLOWUP_EMAIL_SUBJECT,
          html,
        })
        const { error: updateError } = await admin
          .from('profiles')
          .update({ founding_followup_sent: true })
          .eq('id', user.id)

        if (updateError) {
          console.error(`Founding follow-up: failed to set flag for ${user.id}`, updateError)
          errors.push(`${user.email}: email sent but flag update failed`)
          failed += 1
        } else {
          sent += 1
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        console.error(`Founding follow-up send failed for ${user.email}:`, err)
        errors.push(`${user.email}: ${msg}`)
        failed += 1
      }

      if (i < eligible.length - 1) {
        await delay(DELAY_BETWEEN_SENDS_MS)
      }
    }

    console.log(`Founding follow-up: sent=${sent} failed=${failed} total=${eligible.length}`)

    return NextResponse.json({
      success: true,
      sent,
      failed,
      total: eligible.length,
      ...(errors.length > 0 && { errors }),
    })
  } catch (err: unknown) {
    console.error('Founding follow-up POST error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
