import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, getAdminSupabase } from '@/lib/admin'
import { slugify } from '@/lib/slugify'

export const dynamic = 'force-dynamic'

/**
 * GET: list all travel guides (admin).
 * POST: create a draft guide.
 */
export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request)
  if (auth instanceof NextResponse) return auth

  const admin = getAdminSupabase()
  const { data, error } = await admin
    .from('travel_guides')
    .select('*')
    .order('updated_at', { ascending: false })

  if (error) {
    console.error('Admin guides list error:', error)
    return NextResponse.json({ error: 'Failed to load guides' }, { status: 500 })
  }

  return NextResponse.json({ guides: data || [] })
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request)
  if (auth instanceof NextResponse) return auth

  const body = await request.json().catch(() => ({}))
  const title = typeof body.title === 'string' ? body.title.trim() : ''
  if (!title) {
    return NextResponse.json({ error: 'Title is required' }, { status: 400 })
  }

  const admin = getAdminSupabase()
  let slug =
    typeof body.slug === 'string' && body.slug.trim()
      ? slugify(body.slug.trim())
      : slugify(title)

  // Ensure unique slug
  const { data: existing } = await admin
    .from('travel_guides')
    .select('slug')
    .eq('slug', slug)
    .maybeSingle()
  if (existing) {
    slug = `${slug}-${Date.now().toString(36).slice(-4)}`
  }

  const { data, error } = await admin
    .from('travel_guides')
    .insert({
      title,
      slug,
      excerpt: typeof body.excerpt === 'string' ? body.excerpt.trim() || null : null,
      introduction:
        typeof body.introduction === 'string' ? body.introduction.trim() || null : null,
      destination_name:
        typeof body.destination_name === 'string'
          ? body.destination_name.trim() || null
          : null,
      city: typeof body.city === 'string' ? body.city.trim() || null : null,
      region: typeof body.region === 'string' ? body.region.trim() || null : null,
      country: typeof body.country === 'string' ? body.country.trim() || null : null,
      cover_image_url:
        typeof body.cover_image_url === 'string'
          ? body.cover_image_url.trim() || null
          : null,
      seo_title: typeof body.seo_title === 'string' ? body.seo_title.trim() || null : null,
      seo_description:
        typeof body.seo_description === 'string'
          ? body.seo_description.trim() || null
          : null,
      status: 'draft',
      featured: Boolean(body.featured),
      author_name:
        typeof body.author_name === 'string' && body.author_name.trim()
          ? body.author_name.trim()
          : 'FIBI',
    })
    .select('*')
    .single()

  if (error || !data) {
    console.error('Admin create guide error:', error)
    return NextResponse.json({ error: 'Failed to create guide' }, { status: 500 })
  }

  return NextResponse.json({ guide: data }, { status: 201 })
}
