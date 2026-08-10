import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin'
import { runCampaignSend } from '@/lib/run-email-campaigns'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

/**
 * POST /api/admin/emails/campaigns/[id]/send — send immediately (draft/scheduled/failed).
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdmin(request)
    if (auth instanceof NextResponse) return auth

    const { id } = await params
    const result = await runCampaignSend(id)

    const noAudience = result.errors.some((e) => e.includes('No recipients matched'))
    if (noAudience || (result.sent === 0 && result.failed === 0 && result.errors.length > 0)) {
      return NextResponse.json(
        {
          error: result.errors[0] || 'Send failed',
          sent: result.sent,
          skipped: result.skipped,
          failed: result.failed,
          limitReached: result.limitReached,
          errors: result.errors,
        },
        { status: 400 }
      )
    }

    return NextResponse.json({
      sent: result.sent,
      skipped: result.skipped,
      failed: result.failed,
      limitReached: result.limitReached,
      errors: result.errors,
    })
  } catch (err) {
    console.error('[admin/campaigns/send]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
