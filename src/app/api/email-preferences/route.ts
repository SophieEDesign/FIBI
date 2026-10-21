import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth'
import { getAdminSupabase } from '@/lib/admin'
import { applyMarketingOptIn, applyMarketingUnsubscribe } from '@/lib/marketing-unsubscribe'

export const dynamic = 'force-dynamic'

/**
 * GET /api/email-preferences — current marketing_opt_in for the signed-in user.
 */
export async function GET(request: NextRequest) {
  const auth = await requireUser(request)
  if (auth instanceof NextResponse) return auth
  const { user } = auth

  const admin = getAdminSupabase()
  const { data, error } = await admin
    .from('profiles')
    .select('marketing_opt_in')
    .eq('id', user.id)
    .maybeSingle()

  if (error) {
    console.error('email-preferences GET', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }

  return NextResponse.json({
    marketing_opt_in: data?.marketing_opt_in ?? false,
  })
}

/**
 * PATCH /api/email-preferences — body { marketing_opt_in: boolean }
 */
export async function PATCH(request: NextRequest) {
  const auth = await requireUser(request)
  if (auth instanceof NextResponse) return auth
  const { user } = auth

  let body: { marketing_opt_in?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  if (typeof body.marketing_opt_in !== 'boolean') {
    return NextResponse.json({ error: 'marketing_opt_in must be a boolean' }, { status: 400 })
  }

  if (body.marketing_opt_in === false) {
    const result = await applyMarketingUnsubscribe(user.id, 'preferences')
    if (!result.ok) {
      return NextResponse.json({ error: 'That didn\'t work. Try again.' }, { status: 500 })
    }
    return NextResponse.json({ marketing_opt_in: false })
  }

  const result = await applyMarketingOptIn(user.id)
  if (!result.ok) {
    return NextResponse.json({ error: 'That didn\'t work. Try again.' }, { status: 500 })
  }

  return NextResponse.json({ marketing_opt_in: true })
}
