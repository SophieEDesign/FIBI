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

    const { getAdminSupabase } = await import('@/lib/admin')
    const { writeAdminAuditLog } = await import('@/lib/admin-audit')
    await writeAdminAuditLog(getAdminSupabase(), {
      actorId: auth.userId,
      action: 'email.automation_run',
      targetType: 'email_automation',
      targetId: id,
      meta: {
        sent: result.sent,
        skipped: result.skipped,
        failed: result.failed,
      },
    })

    return NextResponse.json(result)
  } catch (err) {
    console.error('Admin automations run [id]:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
