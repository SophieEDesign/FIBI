import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, getAdminSupabase } from '@/lib/admin'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/emails/segments/[id]
 * PATCH /api/admin/emails/segments/[id]
 * DELETE /api/admin/emails/segments/[id]
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdmin(request)
    if (auth instanceof NextResponse) return auth

    const { id } = await params
    const admin = getAdminSupabase()
    const { data, error } = await admin.from('email_segments').select('*').eq('id', id).maybeSingle()

    if (error) {
      console.error('segments/[id] GET', error)
      return NextResponse.json({ error: 'Failed to load segment' }, { status: 500 })
    }
    if (!data) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
    return NextResponse.json({ segment: data })
  } catch (e) {
    console.error('segments/[id] GET', e)
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
    let body: { name?: string; description?: string; conditions?: Record<string, unknown> }
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
    }

    const patch: Record<string, unknown> = {}
    if (typeof body.name === 'string') {
      const name = body.name.trim()
      if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 })
      patch.name = name
    }
    if (typeof body.description === 'string') patch.description = body.description.trim()
    if (body.conditions && typeof body.conditions === 'object') patch.conditions = body.conditions

    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
    }

    const admin = getAdminSupabase()
    const { data, error } = await admin
      .from('email_segments')
      .update(patch)
      .eq('id', id)
      .select('*')
      .single()

    if (error) {
      console.error('segments/[id] PATCH', error)
      return NextResponse.json({ error: 'Failed to update segment' }, { status: 500 })
    }

    return NextResponse.json({ segment: data })
  } catch (e) {
    console.error('segments/[id] PATCH', e)
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
    const { error } = await admin.from('email_segments').delete().eq('id', id)

    if (error) {
      console.error('segments/[id] DELETE', error)
      return NextResponse.json({ error: 'Failed to delete segment' }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('segments/[id] DELETE', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
