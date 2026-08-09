import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * Deprecated: typed send duplicate of send-welcome / send-onboarding-nudge.
 */
export async function POST() {
  return NextResponse.json(
    {
      error: 'Gone',
      detail:
        'POST /api/email/send is deprecated. Use /api/admin/send-welcome or /api/admin/send-onboarding-nudge.',
    },
    { status: 410 }
  )
}
