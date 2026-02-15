import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAdminSupabase } from '@/lib/admin'
import { createConfirmEmailToken } from '@/lib/confirm-email-token'
import { sendConfirmEmail } from '@/lib/email-templates'

export const dynamic = 'force-dynamic'

/**
 * POST /api/auth/resend-confirm-email
 * Resends the confirmation email via Resend (same flow as signup).
 * - If authenticated: uses session user. Rate limited per user.
 * - If not authenticated: body { email: string }. Finds user by email (admin),
 *   sends only if email not confirmed. Rate limited per email. Use when session
 *   is missing (e.g. Vercel preview, cookie blocked).
 */
const COOLDOWN_MS = 60 * 1000
const cooldownsByUserId = new Map<string, number>()
const cooldownsByEmail = new Map<string, number>()

function isValidEmail(s: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim())
}

/** Find user by email via admin listUsers (paginated). */
async function findUserByEmail(email: string): Promise<{ id: string; email: string } | null> {
  const admin = getAdminSupabase()
  const normalized = email.trim().toLowerCase()
  let page = 0
  const perPage = 50
  while (true) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage })
    if (error) return null
    const user = data.users.find(
      (u) => u.email?.trim().toLowerCase() === normalized
    )
    if (user?.id && user.email) return { id: user.id, email: user.email }
    if (data.users.length < perPage) break
    page++
    if (page > 20) break // cap at 1000 users
  }
  return null
}

export async function POST(request: NextRequest) {
  const supabase = await createClient(request)
  const { data: { user: sessionUser } } = await supabase.auth.getUser()
  const now = Date.now()

  // Authenticated path: use session user
  if (sessionUser?.email && sessionUser?.id) {
    const last = cooldownsByUserId.get(sessionUser.id)
    if (last != null && now - last < COOLDOWN_MS) {
      const waitSec = Math.ceil((COOLDOWN_MS - (now - last)) / 1000)
      return NextResponse.json(
        { error: `Please wait ${waitSec} seconds before resending.` },
        { status: 429 }
      )
    }
    cooldownsByUserId.set(sessionUser.id, now)
    try {
      const origin = request.nextUrl.origin
      const token = createConfirmEmailToken(sessionUser.id)
      const confirmUrl = `${origin}/api/confirm-email?token=${encodeURIComponent(token)}`
      await sendConfirmEmail({ to: sessionUser.email, confirmUrl })
    } catch (err) {
      console.error('Resend confirm email error:', err)
      cooldownsByUserId.delete(sessionUser.id)
      return NextResponse.json(
        { error: 'Failed to send email. Please try again.' },
        { status: 500 }
      )
    }
    return NextResponse.json({ ok: true })
  }

  // Unauthenticated path: require body { email }
  let body: { email?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { error: 'Not authenticated. Send { "email": "your@email.com" } to resend the confirmation link.' },
      { status: 401 }
    )
  }
  const email = typeof body.email === 'string' ? body.email.trim() : ''
  if (!email || !isValidEmail(email)) {
    return NextResponse.json(
      { error: 'Valid email is required.' },
      { status: 400 }
    )
  }
  const emailKey = email.toLowerCase()
  const last = cooldownsByEmail.get(emailKey)
  if (last != null && now - last < COOLDOWN_MS) {
    const waitSec = Math.ceil((COOLDOWN_MS - (now - last)) / 1000)
    return NextResponse.json(
      { error: `Please wait ${waitSec} seconds before resending.` },
      { status: 429 }
    )
  }
  cooldownsByEmail.set(emailKey, now)

  const user = await findUserByEmail(email)
  if (!user) {
    // Don't reveal whether the email exists; same message as success
    return NextResponse.json({ ok: true })
  }
  const admin = getAdminSupabase()
  const { data: authUser } = await admin.auth.admin.getUserById(user.id)
  if (authUser?.user?.email_confirmed_at) {
    return NextResponse.json({ ok: true })
  }

  try {
    const origin = request.nextUrl.origin
    const token = createConfirmEmailToken(user.id)
    const confirmUrl = `${origin}/api/confirm-email?token=${encodeURIComponent(token)}`
    await sendConfirmEmail({ to: user.email, confirmUrl })
  } catch (err) {
    console.error('Resend confirm email error (by email):', err)
    cooldownsByEmail.delete(emailKey)
    return NextResponse.json(
      { error: 'Failed to send email. Please try again.' },
      { status: 500 }
    )
  }
  return NextResponse.json({ ok: true })
}
