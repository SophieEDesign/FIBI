import { NextResponse } from 'next/server'
import { isCronAuthorized, runEmailAutomations } from '@/lib/run-email-automations'
import { getAdminSupabase } from '@/lib/admin'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

/**
 * Cron endpoint for daily email automation.
 * Writes to automation_runs for dashboard status.
 */
export async function GET(request: Request) {
  if (!isCronAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = getAdminSupabase()
  const { data: runRow, error: insertError } = await admin
    .from('automation_runs')
    .insert({ status: 'running' })
    .select('id')
    .single()

  if (insertError || !runRow?.id) {
    console.error('[cron/email-automations] insert run:', insertError)
  }

  try {
    const result = await runEmailAutomations()

    if (runRow?.id) {
      await admin
        .from('automation_runs')
        .update({
          finished_at: new Date().toISOString(),
          sent: result.sent,
          skipped: result.skipped,
          failed: result.failed,
          status: result.failed > 0 ? 'failure' : 'success',
          errors: result.errors?.length ? result.errors : [],
        })
        .eq('id', runRow.id)
    }

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
    if (runRow?.id) {
      await admin
        .from('automation_runs')
        .update({
          finished_at: new Date().toISOString(),
          status: 'failure',
          errors: [message],
        })
        .eq('id', runRow.id)
    }
    console.error('[cron/email-automations]', message)
    return NextResponse.json(
      { error: 'Internal error', detail: message },
      { status: 500 }
    )
  }
}
