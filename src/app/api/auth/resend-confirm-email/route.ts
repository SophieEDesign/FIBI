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

/** Find user by email via admin listUsers (paginated). Throws on listUsers API error so route can return 500 instead of 200. */
async function findUserByEmail(email: string): Promise<{ id: string; email: string } | null> {
  const admin = getAdminSupabase()
  const normalized = email.trim().toLowerCase()
  let page = 0
  const perPage = 50
  while (true) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage })
    if (error) throw new Error(`listUsers failed: ${error.message}`)
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

  // Authenticated path: use session user (trim email for Resend's to field)
  const sessionEmail = typeof sessionUser?.email === 'string' ? sessionUser.email.trim() : ''
  if (sessionEmail && isValidEmail(sessionEmail) && sessionUser?.id) {
    // Sync profile if Supabase says confirmed but profile doesn't (so UI banner can hide)
    const admin = getAdminSupabase()
    const [authResult, profileResult] = await Promise.all([
      admin.auth.admin.getUserById(sessionUser.id),
      admin.from('profiles').select('email_verified_at').eq('id', sessionUser.id).single(),
    ])
    if (authResult.data?.user?.email_confirmed_at && !profileResult.data?.email_verified_at) {
      await admin.from('profiles').update({ email_verified_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq('id', sessionUser.id)
    }
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
      await sendConfirmEmail({ to: sessionEmail, confirmUrl })
    } catch (err) {
      console.error('Resend confirm email error (auth path):', err)
      cooldownsByUserId.delete(sessionUser.id)
      const message = err instanceof Error ? err.message : String(err)
      const isConfig = message.includes('RESEND_API_KEY') || message.includes('not set')
      const userMessage = isConfig
        ? 'RESEND_API_KEY is not set. Add it in Vercel → Project → Settings → Environment Variables for Production (and Preview if testing there).'
        : (message.includes('Failed to send email') ? message : `Failed to send email: ${message}`)
      return NextResponse.json({ error: userMessage }, { status: 500 })
    }
    return NextResponse.json({ ok: true })
  }

  // Unauthenticated path: require body { email } (used when session/cookies aren't available)
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

  let user: { id: string; email: string } | null = null
  try {
    user = await findUserByEmail(email)
  } catch (adminErr) {
    console.error('Resend confirm: findUserByEmail failed:', adminErr)
    return NextResponse.json(
      { error: 'Could not send right now. Try again in a minute.' },
      { status: 500 }
    )
  }
  if (!user) {
    // Don't reveal whether the email exists; same response as success
    return NextResponse.json({ ok: true })
  }
  // Sync profile if Supabase says confirmed but profile doesn't (so UI banner can hide)
  const admin = getAdminSupabase()
  const [authResult, profileResult] = await Promise.all([
    admin.auth.admin.getUserById(user.id),
    admin.from('profiles').select('email_verified_at').eq('id', user.id).single(),
  ])
  if (authResult.data?.user?.email_confirmed_at && !profileResult.data?.email_verified_at) {
    await admin.from('profiles').update({ email_verified_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq('id', user.id)
  }

  const toEmail = (user.email || '').trim()
  if (!toEmail || !isValidEmail(toEmail)) {
    return NextResponse.json({ ok: true })
  }

  try {
    const origin = request.nextUrl.origin
    const token = createConfirmEmailToken(user.id)
    const confirmUrl = `${origin}/api/confirm-email?token=${encodeURIComponent(token)}`
    await sendConfirmEmail({ to: toEmail, confirmUrl })
  } catch (err) {
    console.error('Resend confirm email error (by email):', err)
    cooldownsByEmail.delete(emailKey)
    const message = err instanceof Error ? err.message : String(err)
    const isConfig = message.includes('RESEND_API_KEY') || message.includes('not set')
    const userMessage = isConfig
      ? 'RESEND_API_KEY is not set. Add it in Vercel → Project → Settings → Environment Variables for Production (and Preview if testing there).'
      : (message.includes('Failed to send email') ? message : `Failed to send email: ${message}`)
    return NextResponse.json({ error: userMessage }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
