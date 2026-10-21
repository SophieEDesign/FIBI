import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth'
import { isWebPushConfigured } from '@/lib/web-push'

export const dynamic = 'force-dynamic'

/**
 * POST /api/push/subscribe — save or refresh the current user's push subscription.
 * Body: { endpoint, keys: { p256dh, auth }, user_agent? }
 */
export async function POST(request: NextRequest) {
  try {
    if (!isWebPushConfigured()) {
      return NextResponse.json({ error: 'Push is not configured yet.' }, { status: 503 })
    }

    const auth = await requireUser(request)
    if (auth instanceof NextResponse) return auth

    const body = await request.json().catch(() => ({}))
    const endpoint = typeof body.endpoint === 'string' ? body.endpoint.trim() : ''
    const p256dh =
      body.keys && typeof body.keys.p256dh === 'string' ? body.keys.p256dh.trim() : ''
    const authKey =
      body.keys && typeof body.keys.auth === 'string' ? body.keys.auth.trim() : ''
    const userAgent =
      typeof body.user_agent === 'string' ? body.user_agent.slice(0, 500) : null

    if (!endpoint || !p256dh || !authKey) {
      return NextResponse.json(
        { error: 'endpoint and keys.p256dh / keys.auth are required' },
        { status: 400 }
      )
    }

    const { error } = await auth.supabase.from('push_subscriptions').upsert(
      {
        user_id: auth.userId,
        endpoint,
        p256dh,
        auth: authKey,
        user_agent: userAgent,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'endpoint' }
    )

    if (error) {
      console.error('[push/subscribe] upsert', error)
      return NextResponse.json({ error: 'Failed to save subscription' }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[push/subscribe] POST', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * DELETE /api/push/subscribe — remove a subscription by endpoint (or all for user).
 * Body: { endpoint?: string }
 */
export async function DELETE(request: NextRequest) {
  try {
    const auth = await requireUser(request)
    if (auth instanceof NextResponse) return auth

    const body = await request.json().catch(() => ({}))
    const endpoint = typeof body.endpoint === 'string' ? body.endpoint.trim() : ''

    let query = auth.supabase.from('push_subscriptions').delete().eq('user_id', auth.userId)
    if (endpoint) {
      query = query.eq('endpoint', endpoint)
    }

    const { error } = await query
    if (error) {
      console.error('[push/subscribe] delete', error)
      return NextResponse.json({ error: 'Failed to remove subscription' }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[push/subscribe] DELETE', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * GET /api/push/subscribe — whether the signed-in user has at least one subscription.
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await requireUser(request)
    if (auth instanceof NextResponse) return auth

    const { count, error } = await auth.supabase
      .from('push_subscriptions')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', auth.userId)

    if (error) {
      return NextResponse.json({ error: 'Failed to load status' }, { status: 500 })
    }

    return NextResponse.json({
      configured: isWebPushConfigured(),
      subscribed: (count ?? 0) > 0,
      publicKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim() || null,
    })
  } catch (err) {
    console.error('[push/subscribe] GET', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
