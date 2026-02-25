import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, getAdminSupabase } from '@/lib/admin'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/emails/automation-status
 * Returns last automation run for dashboard (started_at, finished_at, sent, skipped, failed, status, errors).
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdmin(request)
    if (auth instanceof NextResponse) return auth

    const admin = getAdminSupabase()
    const { data, error } = await admin
      .from('automation_runs')
      .select('started_at, finished_at, sent, skipped, failed, status, errors')
      .order('started_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) {
      console.error('Error fetching automation status:', error)
      return NextResponse.json({ error: 'Failed to fetch status' }, { status: 500 })
    }

    const lastRun = data
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

    return NextResponse.json({ lastRun })
  } catch (e) {
    console.error('automation-status', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
