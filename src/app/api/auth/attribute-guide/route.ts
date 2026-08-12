import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAdminSupabase } from '@/lib/admin'
import { applySignupGuideAttribution } from '@/lib/apply-signup-guide-attribution'

export const dynamic = 'force-dynamic'

/**
 * Persist guide signup attribution for the current user (anonymous upgrade / first touch).
 * Idempotent — only writes when signup_guide_id is still null.
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }

  let body: { fromGuide?: string } = {}
  try {
    body = await request.json()
  } catch {
    // empty body ok — fall back to cookie
  }

  const fromGuide =
    (typeof body.fromGuide === 'string' && body.fromGuide.trim()) ||
    request.cookies.get('fibi_guide_attr')?.value?.trim() ||
    ''

  if (!fromGuide) {
    return NextResponse.json({ ok: true, attributed: false })
  }

  try {
    await applySignupGuideAttribution(getAdminSupabase(), user.id, fromGuide)
    return NextResponse.json({ ok: true, attributed: true })
  } catch (err) {
    console.error('attribute-guide error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
