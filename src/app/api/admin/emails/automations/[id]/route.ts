import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, getAdminSupabase } from '@/lib/admin'

export const dynamic = 'force-dynamic'

const TRIGGER_TYPES = ['user_confirmed', 'user_inactive', 'place_added', 'itinerary_created', 'manual'] as const

/**
 * PATCH /api/admin/emails/automations/[id] — update automation
 */
export async function PATCH(
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

    const body = await request.json().catch(() => ({}))
    const updates: Record<string, unknown> = {}

    if (typeof body.name === 'string') updates.name = body.name.trim()
    if (typeof body.template_slug === 'string') updates.template_slug = body.template_slug.trim()
    if (typeof body.trigger_type === 'string') {
      const t = body.trigger_type.trim()
      if (TRIGGER_TYPES.includes(t as (typeof TRIGGER_TYPES)[number])) {
        updates.trigger_type = t
      }
    }
    if (body.conditions != null && typeof body.conditions === 'object') updates.conditions = body.conditions
    if (typeof body.delay_hours === 'number') updates.delay_hours = body.delay_hours
    if (typeof body.is_active === 'boolean') updates.is_active = body.is_active

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
    }

    const admin = getAdminSupabase()
    const { data, error } = await admin
      .from('email_automations')
      .update(updates)
      .eq('id', id)
      .select('*')
      .single()

    if (error) {
      if (error.code === '23503') {
        return NextResponse.json({ error: 'Template not found' }, { status: 400 })
      }
      console.error('Error updating automation:', error)
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }

    if (!data) {
      return NextResponse.json({ error: 'Automation not found' }, { status: 404 })
    }

    return NextResponse.json(data)
  } catch (err) {
    console.error('Admin automations PATCH [id]:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
