import { NextResponse } from 'next/server'
import { isCronAuthorized, runEmailAutomations } from '@/lib/run-email-automations'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

/**
 * Cron endpoint for daily email automation.
 * Verifies CRON_KEY via Authorization: Bearer <CRON_KEY>.
 * Vercel Cron sends this header when CRON_SECRET is set.
 * Use CRON_KEY in env; set same value as CRON_SECRET if using Vercel Cron.
 */
export async function GET(request: Request) {
  if (!isCronAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const result = await runEmailAutomations()

    const summary = {
      sent: result.sent,
      skipped: result.skipped,
      failed: result.failed,
      limitReached: result.limitReached,
      errorCount: result.errors.length,
    }

    console.log('[cron/email-automations]', summary)
    if (result.errors.length > 0) {
      result.errors.forEach((e) => console.error('[cron/email-automations]', e))
    }

    return NextResponse.json(summary)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[cron/email-automations]', message)
    return NextResponse.json(
      { error: 'Internal error', detail: message },
      { status: 500 }
    )
  }
}
