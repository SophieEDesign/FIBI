import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * Deprecated: arbitrary HTML send. Prefer templates / automations / campaigns.
 */
export async function POST() {
  return NextResponse.json(
    {
      error: 'Gone',
      detail: 'POST /api/email is deprecated. Use admin email templates, automations, or campaigns.',
    },
    { status: 410 }
  )
}
