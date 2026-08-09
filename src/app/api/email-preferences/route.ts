import { NextRequest, NextResponse } from 'next/server'
import { createClient, createClientWithToken } from '@/lib/supabase/server'
import { getAdminSupabase } from '@/lib/admin'
import { applyMarketingUnsubscribe } from '@/lib/marketing-unsubscribe'

export const dynamic = 'force-dynamic'

async function getAuthedUser(request: NextRequest) {
  const authHeader = request.headers.get('Authorization')
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : null

  if (token) {
    const supabase = createClientWithToken(token)
    const { data, error } = await supabase.auth.getUser(token)
    if (!error && data.user) return data.user
  }

  const supabase = await createClient(request)
  const { data, error } = await supabase.auth.getUser()
  if (!error && data.user) return data.user
  return null
}

/**
 * GET /api/email-preferences — current marketing_opt_in for the signed-in user.
 */
export async function GET(request: NextRequest) {
  const user = await getAuthedUser(request)
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

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
  const user = await getAuthedUser(request)
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

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
    const result = await applyMarketingUnsubscribe(user.id)
    if (!result.ok) {
      return NextResponse.json({ error: 'That didn\'t work. Try again.' }, { status: 500 })
    }
    return NextResponse.json({ marketing_opt_in: false })
  }

  const admin = getAdminSupabase()
  const { error } = await admin
    .from('profiles')
    .update({ marketing_opt_in: true, updated_at: new Date().toISOString() })
    .eq('id', user.id)

  if (error) {
    console.error('email-preferences PATCH', error)
    return NextResponse.json({ error: 'That didn\'t work. Try again.' }, { status: 500 })
  }

  return NextResponse.json({ marketing_opt_in: true })
}
