import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, getAdminSupabase } from '@/lib/admin'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/emails/log
 * Query: template_slug, limit (default 100), offset (default 0)
 * Returns sent emails with recipient, template, sent_at, status, clicks count.
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdmin(request)
    if (auth instanceof NextResponse) return auth

    const { searchParams } = request.nextUrl
    const templateSlug = searchParams.get('template_slug')?.trim() || undefined
    const limit = Math.min(500, Math.max(1, parseInt(searchParams.get('limit') ?? '100', 10) || 100))
    const offset = Math.max(0, parseInt(searchParams.get('offset') ?? '0', 10) || 0)

    const admin = getAdminSupabase()

    let query = admin
      .from('email_logs')
      .select('id, user_id, recipient_email, template_slug, automation_id, sent_at, status, resend_email_id', { count: 'exact' })
      .order('sent_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (templateSlug) {
      query = query.eq('template_slug', templateSlug)
    }

    const { data: logs, error: logError, count: total } = await query

    if (logError) {
      console.error('Error fetching email log:', logError)
      return NextResponse.json({ error: 'Failed to fetch log' }, { status: 500 })
    }

    const logIds = (logs ?? []).map((r: { id: string }) => r.id)
    const clickCounts = new Map<string, number>()

    if (logIds.length > 0) {
      const { data: clicks } = await admin
        .from('email_link_clicks')
        .select('email_log_id')
        .in('email_log_id', logIds)
      clicks?.forEach((c: { email_log_id: string }) => {
        clickCounts.set(c.email_log_id, (clickCounts.get(c.email_log_id) ?? 0) + 1)
      })
    }

    const items = (logs ?? []).map((row: { id: string; user_id: string; recipient_email: string | null; template_slug: string; automation_id: string | null; sent_at: string; status: string; resend_email_id: string | null }) => ({
      id: row.id,
      user_id: row.user_id,
      recipient_email: row.recipient_email ?? null,
      template_slug: row.template_slug,
      automation_id: row.automation_id ?? null,
      sent_at: row.sent_at,
      status: row.status,
      resend_email_id: row.resend_email_id ?? null,
      clicks: clickCounts.get(row.id) ?? 0,
    }))

    return NextResponse.json({
      logs: items,
      total: typeof total === 'number' ? total : items.length,
      limit,
      offset,
    })
  } catch (e) {
    console.error('admin/emails/log', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
