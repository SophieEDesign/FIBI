import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, getAdminSupabase } from '@/lib/admin'
import { runEmailAutomations } from '@/lib/run-email-automations'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

/**
 * Admin manual trigger for email automations.
 * Requires admin role. Writes to automation_runs for dashboard status.
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdmin(request)
    if (auth instanceof NextResponse) return auth

    const admin = getAdminSupabase()
    const { data: runRow, error: insertError } = await admin
      .from('automation_runs')
      .insert({ status: 'running' })
      .select('id')
      .single()

    if (insertError || !runRow?.id) {
      console.error('[admin/run-automations] insert run:', insertError)
      // Continue without recording; still run automations
    }

    let result: { sent: number; skipped: number; failed: number; limitReached: boolean; errors: string[] }
    try {
      result = await runEmailAutomations()
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
      throw err
    }

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
