import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createConfirmEmailToken } from '@/lib/confirm-email-token'
import { sendConfirmEmail } from '@/lib/email-templates'

export const dynamic = 'force-dynamic'

/**
 * POST /api/auth/resend-confirm-email
 * Resends the confirmation email via Resend (same flow as signup).
 * Requires authenticated user. Rate limited to once per 60 seconds per user.
 */
const COOLDOWN_MS = 60 * 1000
const cooldowns = new Map<string, number>()

export async function POST(request: NextRequest) {
  const supabase = await createClient(request)
  const { data: { user } } = await supabase.auth.getUser()

  if (!user?.email || !user?.id) {
    return NextResponse.json(
      { error: 'Not authenticated' },
      { status: 401 }
    )
  }

  // 60 second cooldown per user
  const now = Date.now()
  const last = cooldowns.get(user.id)
  if (last != null && now - last < COOLDOWN_MS) {
    const waitSec = Math.ceil((COOLDOWN_MS - (now - last)) / 1000)
    return NextResponse.json(
      { error: `Please wait ${waitSec} seconds before resending.` },
      { status: 429 }
    )
  }
  cooldowns.set(user.id, now)

  try {
    const origin = request.nextUrl.origin
    const token = createConfirmEmailToken(user.id)
    const confirmUrl = `${origin}/api/confirm-email?token=${encodeURIComponent(token)}`
    await sendConfirmEmail({ to: user.email, confirmUrl })
  } catch (err) {
    console.error('Resend confirm email error:', err)
    cooldowns.delete(user.id) // allow retry on failure
    return NextResponse.json(
      { error: 'Failed to send email. Please try again.' },
      { status: 500 }
    )
  }

  return NextResponse.json({ ok: true })
}
