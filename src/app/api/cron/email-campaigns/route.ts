import { NextRequest, NextResponse } from 'next/server'
import { isCronAuthorized, runDueCampaigns } from '@/lib/run-email-campaigns'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

/**
 * GET /api/cron/email-campaigns
 * Runs due scheduled campaigns. Auth: Bearer CRON_KEY or CRON_SECRET.
 */
export async function GET(request: NextRequest) {
  if (!isCronAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { processed, results } = await runDueCampaigns()
    return NextResponse.json({
      ok: true,
      processed,
      results: results.map((r) => ({
        campaignId: r.campaignId,
        name: r.name,
        sent: r.result.sent,
        failed: r.result.failed,
        skipped: r.result.skipped,
        errors: r.result.errors.slice(0, 5),
      })),
    })
  } catch (err) {
    console.error('[cron/email-campaigns]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
