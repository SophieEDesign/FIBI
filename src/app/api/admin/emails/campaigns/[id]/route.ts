import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, getAdminSupabase } from '@/lib/admin'
import type { AutomationConditions } from '@/lib/email-automations'

export const dynamic = 'force-dynamic'

function parseFilters(raw: unknown): AutomationConditions | null {
  if (!raw || typeof raw !== 'object') return null
  const f = raw as Record<string, unknown>
  const filters: AutomationConditions = {}
  if (typeof f.confirmed === 'boolean') filters.confirmed = f.confirmed
  if (typeof f.places_count_gt === 'number') filters.places_count_gt = f.places_count_gt
  if (typeof f.places_count_lt === 'number') filters.places_count_lt = f.places_count_lt
  if (typeof f.itineraries_count_gt === 'number') filters.itineraries_count_gt = f.itineraries_count_gt
  if (typeof f.last_login_days_gt === 'number') filters.last_login_days_gt = f.last_login_days_gt
  if (typeof f.created_days_gt === 'number') filters.created_days_gt = f.created_days_gt
  if (typeof f.created_days_lt === 'number') filters.created_days_lt = f.created_days_lt
  if (typeof f.founding_followup_sent === 'boolean') filters.founding_followup_sent = f.founding_followup_sent
  return Object.keys(filters).length ? filters : null
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdmin(request)
    if (auth instanceof NextResponse) return auth
    const { id } = await params
    const admin = getAdminSupabase()
    const { data, error } = await admin.from('email_campaigns').select('*').eq('id', id).maybeSingle()
    if (error) {
      return NextResponse.json({ error: 'Failed to load campaign' }, { status: 500 })
    }
    if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json({ campaign: data })
  } catch (e) {
    console.error('campaigns/[id] GET', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdmin(request)
    if (auth instanceof NextResponse) return auth
    const { id } = await params

    let body: {
      name?: string
      template_slug?: string
      segment_id?: string | null
      filters?: unknown
      scheduled_at?: string | null
      status?: string
      subject?: string | null
      preview_text?: string | null
      from_name?: string | null
      from_email?: string | null
    }
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
    }

    const admin = getAdminSupabase()
    const { data: existing } = await admin
      .from('email_campaigns')
      .select('status')
      .eq('id', id)
      .maybeSingle()

    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (!['draft', 'scheduled'].includes(existing.status)) {
      return NextResponse.json({ error: 'Only draft or scheduled campaigns can be edited' }, { status: 400 })
    }

    const patch: Record<string, unknown> = {}
    if (typeof body.name === 'string') patch.name = body.name.trim()
    if (typeof body.template_slug === 'string') patch.template_slug = body.template_slug.trim()
    if (body.segment_id === null) {
      patch.segment_id = null
    } else if (typeof body.segment_id === 'string') {
      patch.segment_id = body.segment_id.trim() || null
    }
    if (body.filters !== undefined) {
      patch.filters = parseFilters(body.filters)
    }
    if (body.scheduled_at === null) {
      patch.scheduled_at = null
    } else if (typeof body.scheduled_at === 'string') {
      patch.scheduled_at = body.scheduled_at.trim() || null
    }
    if (body.status === 'draft' || body.status === 'scheduled' || body.status === 'cancelled') {
      patch.status = body.status
    }
    if (body.subject !== undefined) {
      patch.subject = typeof body.subject === 'string' ? body.subject.trim() || null : null
    }
    if (body.preview_text !== undefined) {
      patch.preview_text =
        typeof body.preview_text === 'string' ? body.preview_text.trim() || null : null
    }
    if (body.from_name !== undefined) {
      patch.from_name = typeof body.from_name === 'string' ? body.from_name.trim() || null : null
    }
    if (body.from_email !== undefined) {
      patch.from_email = typeof body.from_email === 'string' ? body.from_email.trim() || null : null
    }

    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
    }

    const { data, error } = await admin
      .from('email_campaigns')
      .update(patch)
      .eq('id', id)
      .select('*')
      .single()

    if (error) {
      console.error('campaigns/[id] PATCH', error)
      return NextResponse.json({ error: 'Failed to update campaign' }, { status: 500 })
    }

    return NextResponse.json({ campaign: data })
  } catch (e) {
    console.error('campaigns/[id] PATCH', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdmin(request)
    if (auth instanceof NextResponse) return auth
    const { id } = await params
    const admin = getAdminSupabase()

    const { data: existing } = await admin
      .from('email_campaigns')
      .select('status')
      .eq('id', id)
      .maybeSingle()

    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (existing.status === 'sending') {
      return NextResponse.json({ error: 'Cannot delete a sending campaign' }, { status: 400 })
    }

    const { error } = await admin.from('email_campaigns').delete().eq('id', id)
    if (error) {
      return NextResponse.json({ error: 'Failed to delete campaign' }, { status: 500 })
    }
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('campaigns/[id] DELETE', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
