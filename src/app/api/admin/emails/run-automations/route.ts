import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin'
import { runEmailAutomations } from '@/lib/run-email-automations'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

/**
 * Admin manual trigger for email automations.
 * Requires admin role. Calls the same logic as the cron endpoint.
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdmin(request)
    if (auth instanceof NextResponse) return auth

    const result = await runEmailAutomations()

    const summary = {
      sent: result.sent,
      skipped: result.skipped,
      failed: result.failed,
      limitReached: result.limitReached,
      errors: result.errors,
    }

    return NextResponse.json(summary)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[admin/run-automations]', message)
    return NextResponse.json(
      { error: 'Internal error', detail: message },
      { status: 500 }
    )
  }
}
