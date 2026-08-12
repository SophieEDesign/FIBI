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

function optionalString(v: unknown): string | null {
  if (typeof v !== 'string') return null
  const t = v.trim()
  return t || null
}

/**
 * GET /api/admin/emails/campaigns
 * POST — create draft/scheduled campaign (Mailchimp-style setup fields supported)
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdmin(request)
    if (auth instanceof NextResponse) return auth

    const admin = getAdminSupabase()
    const { data, error } = await admin
      .from('email_campaigns')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('campaigns GET', error)
      return NextResponse.json({ error: 'Failed to load campaigns' }, { status: 500 })
    }

    return NextResponse.json({ campaigns: data ?? [] })
  } catch (e) {
    console.error('campaigns GET', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdmin(request)
    if (auth instanceof NextResponse) return auth

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

    const name = typeof body.name === 'string' ? body.name.trim() : ''
    const templateSlug = typeof body.template_slug === 'string' ? body.template_slug.trim() : ''
    if (!name || !templateSlug) {
      return NextResponse.json({ error: 'name and template_slug are required' }, { status: 400 })
    }

    const scheduledAt =
      typeof body.scheduled_at === 'string' && body.scheduled_at.trim()
        ? body.scheduled_at.trim()
        : null
    let status = body.status === 'scheduled' ? 'scheduled' : 'draft'
    if (scheduledAt && status === 'draft') status = 'scheduled'
    if (status === 'scheduled' && !scheduledAt) {
      return NextResponse.json({ error: 'scheduled_at is required when scheduling' }, { status: 400 })
    }

    const admin = getAdminSupabase()
    const { data: template } = await admin
      .from('email_templates')
      .select('slug, subject')
      .eq('slug', templateSlug)
      .maybeSingle()
    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 400 })
    }

    const segmentId =
      typeof body.segment_id === 'string' && body.segment_id.trim() ? body.segment_id.trim() : null

    const subject = optionalString(body.subject) ?? template.subject

    const { data, error } = await admin
      .from('email_campaigns')
      .insert({
        name,
        template_slug: templateSlug,
        segment_id: segmentId,
        filters: segmentId ? null : parseFilters(body.filters),
        status,
        scheduled_at: scheduledAt,
        subject,
        preview_text: optionalString(body.preview_text),
        from_name: optionalString(body.from_name) ?? 'FIBI',
        from_email: optionalString(body.from_email) ?? 'hello@fibi.world',
      })
      .select('*')
      .single()

    if (error) {
      console.error('campaigns POST', error)
      return NextResponse.json({ error: 'Failed to create campaign' }, { status: 500 })
    }

    return NextResponse.json({ campaign: data }, { status: 201 })
  } catch (e) {
    console.error('campaigns POST', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
