import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin'
import { runSingleAutomation } from '@/lib/run-email-automations'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

/**
 * POST /api/admin/emails/automations/[id]/run — run single automation now
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdmin(request)
    if (auth instanceof NextResponse) return auth

    const { id } = await params
    if (!id) {
      return NextResponse.json({ error: 'ID required' }, { status: 400 })
    }

    const result = await runSingleAutomation(id)
    return NextResponse.json(result)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('Admin automations run [id]:', err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
