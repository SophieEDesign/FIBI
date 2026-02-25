import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, getAdminSupabase } from '@/lib/admin'

export const dynamic = 'force-dynamic'

const TRIGGER_TYPES = ['user_confirmed', 'user_inactive', 'place_added', 'itinerary_created', 'manual'] as const

/**
 * GET /api/admin/emails/automations — list all automations
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdmin(request)
    if (auth instanceof NextResponse) return auth

    const admin = getAdminSupabase()
    const { data, error } = await admin
      .from('email_automations')
      .select('*')
      .order('name')

    if (error) {
      console.error('Error fetching automations:', error)
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }

    return NextResponse.json({ automations: data ?? [] })
  } catch (err) {
    console.error('Admin automations GET:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/admin/emails/automations — create automation
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdmin(request)
    if (auth instanceof NextResponse) return auth

    const body = await request.json().catch(() => ({}))
    const name = typeof body.name === 'string' ? body.name.trim() : ''
    const template_slug = typeof body.template_slug === 'string' ? body.template_slug.trim() : ''
    const trigger_type = typeof body.trigger_type === 'string' ? body.trigger_type.trim() : ''
    const conditions = body.conditions != null && typeof body.conditions === 'object' ? body.conditions : {}
    const delay_hours = typeof body.delay_hours === 'number' ? body.delay_hours : 0
    const is_active = body.is_active === true

    if (!name || !template_slug || !trigger_type) {
      return NextResponse.json(
        { error: 'name, template_slug, and trigger_type are required' },
        { status: 400 }
      )
    }

    if (!TRIGGER_TYPES.includes(trigger_type as (typeof TRIGGER_TYPES)[number])) {
      return NextResponse.json(
        { error: `trigger_type must be one of: ${TRIGGER_TYPES.join(', ')}` },
        { status: 400 }
      )
    }

    const admin = getAdminSupabase()
    const { data, error } = await admin
      .from('email_automations')
      .insert({
        name,
        template_slug,
        trigger_type,
        conditions,
        delay_hours,
        is_active,
      })
      .select('*')
      .single()

    if (error) {
      if (error.code === '23503') {
        return NextResponse.json({ error: 'Template not found' }, { status: 400 })
      }
      console.error('Error creating automation:', error)
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (err) {
    console.error('Admin automations POST:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
