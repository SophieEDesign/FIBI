import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, getAdminSupabase } from '@/lib/admin'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/emails/log
 * Query: template_slug, limit (default 100), offset (default 0)
 * Returns sent emails with engagement fields + clicks count.
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

    const baseSelect =
      'id, user_id, recipient_email, template_slug, automation_id, campaign_id, sent_at, status, resend_email_id, opened_at, bounced_at, complained_at, delivered_at, unsubscribed_at'
    // error_detail is from migration 054; fall back if not yet applied on this DB
    const selectWithError = `${baseSelect}, error_detail`

    const buildQuery = (columns: string) => {
      let query = admin
        .from('email_logs')
        .select(columns, { count: 'exact' })
        .order('sent_at', { ascending: false })
        .range(offset, offset + limit - 1)

      if (templateSlug) {
        query = query.eq('template_slug', templateSlug)
      }
      const statusFilter = searchParams.get('status')?.trim()
      if (statusFilter === 'sent' || statusFilter === 'failed') {
        query = query.eq('status', statusFilter)
      }
      return query
    }

    let { data: logs, error: logError, count: total } = await buildQuery(selectWithError)

    if (
      logError &&
      typeof logError.message === 'string' &&
      logError.message.includes('error_detail')
    ) {
      ;({ data: logs, error: logError, count: total } = await buildQuery(baseSelect))
    }

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

    // Aggregate rates over recent window (last 30 days of sent)
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
    const { data: recent } = await admin
      .from('email_logs')
      .select('id, status, opened_at, bounced_at, unsubscribed_at')
      .eq('status', 'sent')
      .gte('sent_at', since)

    const recentIds = (recent ?? []).map((r: { id: string }) => r.id)
    let recentClicks = 0
    if (recentIds.length > 0) {
      const { count: clickTotal } = await admin
        .from('email_link_clicks')
        .select('id', { count: 'exact', head: true })
        .in('email_log_id', recentIds)
      recentClicks = clickTotal ?? 0
    }

    const sent30 = recent?.length ?? 0
    const opened30 = (recent ?? []).filter((r: { opened_at: string | null }) => r.opened_at).length
    const bounced30 = (recent ?? []).filter((r: { bounced_at: string | null }) => r.bounced_at).length
    const unsub30 = (recent ?? []).filter((r: { unsubscribed_at: string | null }) => r.unsubscribed_at).length

    const items = (logs ?? []).map(
      (row: {
        id: string
        user_id: string
        recipient_email: string | null
        template_slug: string
        automation_id: string | null
        campaign_id: string | null
        sent_at: string
        status: string
        resend_email_id: string | null
        opened_at: string | null
        bounced_at: string | null
        complained_at: string | null
        delivered_at: string | null
        unsubscribed_at: string | null
      }) => ({
        id: row.id,
        user_id: row.user_id,
        recipient_email: row.recipient_email ?? null,
        template_slug: row.template_slug,
        automation_id: row.automation_id ?? null,
        campaign_id: row.campaign_id ?? null,
        sent_at: row.sent_at,
        status: row.status,
        resend_email_id: row.resend_email_id ?? null,
        opened_at: row.opened_at ?? null,
        bounced_at: row.bounced_at ?? null,
        complained_at: row.complained_at ?? null,
        delivered_at: row.delivered_at ?? null,
        unsubscribed_at: row.unsubscribed_at ?? null,
        error_detail: (row as { error_detail?: string | null }).error_detail ?? null,
        clicks: clickCounts.get(row.id) ?? 0,
      })
    )

    return NextResponse.json({
      logs: items,
      total: typeof total === 'number' ? total : items.length,
      limit,
      offset,
      stats: {
        window_days: 30,
        sent: sent30,
        opened: opened30,
        clicked: recentClicks,
        bounced: bounced30,
        unsubscribed: unsub30,
        open_rate: sent30 > 0 ? opened30 / sent30 : null,
        click_rate: sent30 > 0 ? recentClicks / sent30 : null,
        bounce_rate: sent30 > 0 ? bounced30 / sent30 : null,
        unsub_rate: sent30 > 0 ? unsub30 / sent30 : null,
      },
    })
  } catch (e) {
    console.error('admin/emails/log', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
