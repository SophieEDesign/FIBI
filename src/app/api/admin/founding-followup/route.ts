import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * Deprecated: founding follow-up is covered by automations / one-off sends.
 */
export async function GET() {
  return NextResponse.json(
    {
      error: 'Gone',
      detail: 'Use email automations or one-off sends instead of /api/admin/founding-followup.',
    },
    { status: 410 }
  )
}

export async function POST() {
  return NextResponse.json(
    {
      error: 'Gone',
      detail: 'Use email automations or one-off sends instead of /api/admin/founding-followup.',
    },
    { status: 410 }
  )
}
