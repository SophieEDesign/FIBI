import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, getAdminSupabase } from '@/lib/admin'

export const dynamic = 'force-dynamic'

type RouteContext = { params: Promise<{ id: string }> }

/**
 * GET /api/admin/users/[id]/places — read-only saved places for a person.
 */
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const auth = await requireAdmin(request)
    if (auth instanceof NextResponse) return auth

    const { id } = await context.params
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

    const admin = getAdminSupabase()
    const { data, error } = await admin
      .from('saved_items')
      .select('id, title, url, category, location_city, location_country, created_at, itinerary_id')
      .eq('user_id', id)
      .order('created_at', { ascending: false })
      .limit(100)

    if (error) {
      console.error('admin places', error)
      return NextResponse.json({ error: 'Failed to load places' }, { status: 500 })
    }

    return NextResponse.json({ places: data ?? [] })
  } catch (e) {
    console.error('admin/users/[id]/places', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
