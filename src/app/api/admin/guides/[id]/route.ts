import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, getAdminSupabase } from '@/lib/admin'
import { slugify } from '@/lib/slugify'

export const dynamic = 'force-dynamic'

/**
 * GET one guide + places (admin — includes drafts).
 * PATCH update guide fields / status.
 * DELETE guide (cascades places).
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin(request)
  if (auth instanceof NextResponse) return auth

  const { id } = await params
  const admin = getAdminSupabase()

  const { data: guide, error } = await admin
    .from('travel_guides')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (error || !guide) {
    return NextResponse.json({ error: 'Guide not found' }, { status: 404 })
  }

  const { data: places } = await admin
    .from('travel_guide_places')
    .select('*')
    .eq('guide_id', id)
    .order('display_order', { ascending: true })

  return NextResponse.json({ guide, places: places || [] })
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin(request)
  if (auth instanceof NextResponse) return auth

  const { id } = await params
  const body = await request.json().catch(() => ({}))
  const admin = getAdminSupabase()

  const updates: Record<string, unknown> = {}
  const stringFields = [
    'title',
    'excerpt',
    'introduction',
    'destination_name',
    'city',
    'region',
    'country',
    'cover_image_url',
    'seo_title',
    'seo_description',
    'author_name',
  ] as const

  for (const key of stringFields) {
    if (typeof body[key] === 'string') {
      const v = body[key].trim()
      updates[key] = v || null
    }
  }

  if (typeof body.title === 'string' && !body.title.trim()) {
    return NextResponse.json({ error: 'Title is required' }, { status: 400 })
  }

  if (typeof body.slug === 'string' && body.slug.trim()) {
    const nextSlug = slugify(body.slug.trim())
    const { data: clash } = await admin
      .from('travel_guides')
      .select('id')
      .eq('slug', nextSlug)
      .neq('id', id)
      .maybeSingle()
    if (clash) {
      return NextResponse.json({ error: 'That slug is already in use' }, { status: 409 })
    }
    updates.slug = nextSlug
  }

  if (typeof body.featured === 'boolean') {
    updates.featured = body.featured
  }

  if (typeof body.status === 'string') {
    if (!['draft', 'published', 'archived'].includes(body.status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }
    updates.status = body.status
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No updates' }, { status: 400 })
  }

  const { data, error } = await admin
    .from('travel_guides')
    .update(updates)
    .eq('id', id)
    .select('*')
    .single()

  if (error || !data) {
    console.error('Admin update guide error:', error)
    return NextResponse.json({ error: 'Failed to update guide' }, { status: 500 })
  }

  return NextResponse.json({ guide: data })
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin(request)
  if (auth instanceof NextResponse) return auth

  const { id } = await params
  const admin = getAdminSupabase()
  const { error } = await admin.from('travel_guides').delete().eq('id', id)

  if (error) {
    console.error('Admin delete guide error:', error)
    return NextResponse.json({ error: 'Failed to delete guide' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
