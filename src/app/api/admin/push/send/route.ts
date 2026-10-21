import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, getAdminSupabase } from '@/lib/admin'
import { isWebPushConfigured, sendWebPushToAll } from '@/lib/web-push'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

/**
 * POST /api/admin/push/send
 * Body: { title: string, body: string, url?: string, tag?: string }
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdmin(request)
    if (auth instanceof NextResponse) return auth

    if (!isWebPushConfigured()) {
      return NextResponse.json(
        { error: 'Push is not configured. Set NEXT_PUBLIC_VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY.' },
        { status: 503 }
      )
    }

    const body = await request.json().catch(() => ({}))
    const title = typeof body.title === 'string' ? body.title.trim() : ''
    const message = typeof body.body === 'string' ? body.body.trim() : ''
    const url = typeof body.url === 'string' ? body.url.trim() : '/app'
    const tag = typeof body.tag === 'string' ? body.tag.trim() : 'fibi-update'

    if (!title || !message) {
      return NextResponse.json({ error: 'title and body are required' }, { status: 400 })
    }
    if (title.length > 120 || message.length > 240) {
      return NextResponse.json(
        { error: 'title max 120 chars, body max 240 chars' },
        { status: 400 }
      )
    }

    const result = await sendWebPushToAll({ title, body: message, url, tag })

    const { writeAdminAuditLog } = await import('@/lib/admin-audit')
    await writeAdminAuditLog(getAdminSupabase(), {
      actorId: auth.userId,
      action: 'push.send',
      targetType: 'push',
      targetId: null,
      meta: {
        title,
        sent: result.sent,
        failed: result.failed,
        removed: result.removed,
      },
    })

    return NextResponse.json(result)
  } catch (err) {
    console.error('[admin/push/send]', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/admin/push/send — subscription count for admin UI.
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdmin(request)
    if (auth instanceof NextResponse) return auth

    const admin = getAdminSupabase()
    const { count, error } = await admin
      .from('push_subscriptions')
      .select('id', { count: 'exact', head: true })

    if (error) {
      return NextResponse.json({ error: 'Failed to load stats' }, { status: 500 })
    }

    return NextResponse.json({
      configured: isWebPushConfigured(),
      subscription_count: count ?? 0,
    })
  } catch (err) {
    console.error('[admin/push/send] GET', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
