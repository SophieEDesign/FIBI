import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, getAdminSupabase } from '@/lib/admin'
import { loadAllAdminPeople, metricsFromPeople } from '@/lib/admin-users-data'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/overview
 * Status line + weekly compare + funnel + email rates + newest people.
 * Independent of the paginated People list endpoint.
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdmin(request)
    if (auth instanceof NextResponse) return auth

    const admin = getAdminSupabase()
    const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    const since30d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
    const since7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
    const since14d = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString()

    const [
      failedSendsRes,
      blockedSignupsRes,
      lastRunRes,
      lastFailedRunRes,
      people,
      placesCurrentRes,
      placesPreviousRes,
      emailRecentRes,
    ] = await Promise.all([
      admin
        .from('email_logs')
        .select('id', { count: 'exact', head: true })
        .neq('status', 'sent')
        .gte('sent_at', since24h),
      admin
        .from('signup_attempt_logs')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', since24h),
      admin
        .from('automation_runs')
        .select('started_at, finished_at, sent, skipped, failed, status, errors')
        .order('started_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
      admin
        .from('automation_runs')
        .select('started_at, finished_at, sent, skipped, failed, status, errors')
        .eq('status', 'failure')
        .order('started_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
      loadAllAdminPeople(admin),
      admin
        .from('saved_items')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', since7d),
      admin
        .from('saved_items')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', since14d)
        .lt('created_at', since7d),
      admin
        .from('email_logs')
        .select('id, status, opened_at, bounced_at, unsubscribed_at')
        .eq('status', 'sent')
        .gte('sent_at', since30d),
    ])

    const mapRun = (
      data: {
        started_at: string
        finished_at: string | null
        sent: number
        skipped: number
        failed: number
        status: string
        errors: unknown
      } | null
    ) =>
      data
        ? {
            started_at: data.started_at,
            finished_at: data.finished_at ?? null,
            sent: data.sent ?? 0,
            skipped: data.skipped ?? 0,
            failed: data.failed ?? 0,
            status: data.status as 'running' | 'success' | 'failure',
            errors: Array.isArray(data.errors) ? (data.errors as string[]) : [],
          }
        : null

    const { funnel, insights, weekly } = metricsFromPeople(people)
    weekly.placesSaved = {
      current: placesCurrentRes.count ?? 0,
      previous: placesPreviousRes.count ?? 0,
    }

    const recent = emailRecentRes.data ?? []
    const recentIds = recent.map((r: { id: string }) => r.id)
    let recentClicks = 0
    if (recentIds.length > 0) {
      const { count: clickTotal } = await admin
        .from('email_link_clicks')
        .select('id', { count: 'exact', head: true })
        .in('email_log_id', recentIds)
      recentClicks = clickTotal ?? 0
    }
    const sent30 = recent.length
    const opened30 = recent.filter((r: { opened_at: string | null }) => r.opened_at).length
    const bounced30 = recent.filter((r: { bounced_at: string | null }) => r.bounced_at).length
    const unsub30 = recent.filter((r: { unsubscribed_at: string | null }) => r.unsubscribed_at).length

    const newestPeople = people.slice(0, 5).map((u) => ({
      id: u.id,
      email: u.email,
      created_at: u.created_at,
      state: u.state,
      places_count: u.places_count,
    }))

    return NextResponse.json({
      failedSends: failedSendsRes.count ?? 0,
      blockedSignups: blockedSignupsRes.count ?? 0,
      lastRun: mapRun(lastRunRes.data),
      lastFailedRun: mapRun(lastFailedRunRes.data),
      weekly,
      funnel,
      insights,
      emailEngagement: {
        open_rate: sent30 > 0 ? opened30 / sent30 : null,
        click_rate: sent30 > 0 ? recentClicks / sent30 : null,
        bounce_rate: sent30 > 0 ? bounced30 / sent30 : null,
        unsub_rate: sent30 > 0 ? unsub30 / sent30 : null,
      },
      newestPeople,
    })
  } catch (e) {
    console.error('admin/overview', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
