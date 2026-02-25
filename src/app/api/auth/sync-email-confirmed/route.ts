import { NextRequest, NextResponse } from 'next/server'
import { getAdminSupabase } from '@/lib/admin'

export const dynamic = 'force-dynamic'

const COOLDOWN_MS = 60 * 1000
const cooldownsByEmail = new Map<string, number>()

function isValidEmail(s: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim())
}

/** Find user by email via admin listUsers (paginated). */
async function findUserByEmail(email: string): Promise<{ id: string } | null> {
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
    if (user?.id) return { id: user.id }
    if (data.users.length < perPage) break
    page++
    if (page > 20) break
  }
  return null
}

/**
 * POST /api/auth/sync-email-confirmed
 * Body: { email: string }
 * If the user has profiles.email_verified_at set but Supabase Auth has not
 * marked the email confirmed, updates Auth so signInWithPassword succeeds.
 * Use when login fails with "Email not confirmed" but the user already clicked
 * the app's confirm link. Rate limited per email.
 */
export async function POST(request: NextRequest) {
  let body: { email?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { error: 'Send { "email": "your@email.com" } to sync your confirmed status.' },
      { status: 400 }
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
  const now = Date.now()
  const last = cooldownsByEmail.get(emailKey)
  if (last != null && now - last < COOLDOWN_MS) {
    const waitSec = Math.ceil((COOLDOWN_MS - (now - last)) / 1000)
    return NextResponse.json(
      { error: `Please wait ${waitSec} seconds before trying again.` },
      { status: 429 }
    )
  }
  cooldownsByEmail.set(emailKey, now)

  let user: { id: string } | null = null
  try {
    user = await findUserByEmail(email)
  } catch (err) {
    console.error('sync-email-confirmed: findUserByEmail failed:', err)
    return NextResponse.json(
      { error: 'Could not complete right now. Try again in a minute.' },
      { status: 500 }
    )
  }

  if (!user) {
    // Don't reveal whether the email exists
    return NextResponse.json({ ok: true, synced: false })
  }

  const admin = getAdminSupabase()
  const { data: profile } = await admin
    .from('profiles')
    .select('email_verified_at')
    .eq('id', user.id)
    .single()

  if (!profile?.email_verified_at) {
    return NextResponse.json({
      ok: true,
      synced: false,
      message: 'Confirm your email first using the link we sent you, then try again.',
    })
  }

  const { error: authError } = await admin.auth.admin.updateUserById(user.id, {
    email_confirm: true,
  } as { email_confirm?: boolean })

  if (authError) {
    console.error('sync-email-confirmed: updateUserById failed:', authError)
    return NextResponse.json(
      { error: 'Could not update login status. Try again in a minute.' },
      { status: 500 }
    )
  }

  return NextResponse.json({ ok: true, synced: true })
}
