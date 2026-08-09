import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, getAdminSupabase } from '@/lib/admin'
import { runOneOffSend } from '@/lib/run-email-automations'
import type { AutomationConditions } from '@/lib/email-automations'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

/**
 * POST /api/admin/emails/send-one-off
 * Body: { template_slug: string, filters?: AutomationConditions, segment_id?: string }
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdmin(request)
    if (auth instanceof NextResponse) return auth

    const body = await request.json().catch(() => ({}))
    const templateSlug = typeof body.template_slug === 'string' ? body.template_slug.trim() : ''
    if (!templateSlug) {
      return NextResponse.json({ error: 'template_slug is required' }, { status: 400 })
    }

    let filters: AutomationConditions | null = null

    if (typeof body.segment_id === 'string' && body.segment_id.trim()) {
      const admin = getAdminSupabase()
      const { data: seg } = await admin
        .from('email_segments')
        .select('conditions')
        .eq('id', body.segment_id.trim())
        .maybeSingle()
      if (seg?.conditions && typeof seg.conditions === 'object') {
        filters = seg.conditions as AutomationConditions
      }
    } else if (body.filters && typeof body.filters === 'object') {
      const f = body.filters as Record<string, unknown>
      filters = {}
      if (typeof f.confirmed === 'boolean') filters.confirmed = f.confirmed
      if (typeof f.places_count_gt === 'number') filters.places_count_gt = f.places_count_gt
      if (typeof f.places_count_lt === 'number') filters.places_count_lt = f.places_count_lt
      if (typeof f.itineraries_count_gt === 'number') filters.itineraries_count_gt = f.itineraries_count_gt
      if (typeof f.last_login_days_gt === 'number') filters.last_login_days_gt = f.last_login_days_gt
      if (typeof f.created_days_gt === 'number') filters.created_days_gt = f.created_days_gt
      if (typeof f.created_days_lt === 'number') filters.created_days_lt = f.created_days_lt
      if (typeof f.founding_followup_sent === 'boolean') filters.founding_followup_sent = f.founding_followup_sent
    }

    const result = await runOneOffSend(templateSlug, filters)

    return NextResponse.json({
      sent: result.sent,
      skipped: result.skipped,
      failed: result.failed,
      limitReached: result.limitReached,
      errors: result.errors,
    })
  } catch (err) {
    console.error('[admin/send-one-off]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
