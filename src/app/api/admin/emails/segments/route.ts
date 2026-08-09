import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, getAdminSupabase } from '@/lib/admin'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/emails/segments
 * POST /api/admin/emails/segments — { name, description?, conditions? }
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdmin(request)
    if (auth instanceof NextResponse) return auth

    const admin = getAdminSupabase()
    const { data, error } = await admin
      .from('email_segments')
      .select('*')
      .order('updated_at', { ascending: false })

    if (error) {
      console.error('segments GET', error)
      return NextResponse.json({ error: 'Failed to load segments' }, { status: 500 })
    }

    return NextResponse.json({ segments: data ?? [] })
  } catch (e) {
    console.error('segments GET', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdmin(request)
    if (auth instanceof NextResponse) return auth

    let body: { name?: string; description?: string; conditions?: Record<string, unknown> }
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
    }

    const name = typeof body.name === 'string' ? body.name.trim() : ''
    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }

    const admin = getAdminSupabase()
    const { data, error } = await admin
      .from('email_segments')
      .insert({
        name,
        description: typeof body.description === 'string' ? body.description.trim() : '',
        conditions: body.conditions && typeof body.conditions === 'object' ? body.conditions : {},
      })
      .select('*')
      .single()

    if (error) {
      console.error('segments POST', error)
      return NextResponse.json({ error: 'Failed to create segment' }, { status: 500 })
    }

    return NextResponse.json({ segment: data }, { status: 201 })
  } catch (e) {
    console.error('segments POST', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
