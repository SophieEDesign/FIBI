import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, getAdminSupabase } from '@/lib/admin'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/emails/templates — list all templates
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdmin(request)
    if (auth instanceof NextResponse) return auth

    const admin = getAdminSupabase()
    const { data, error } = await admin
      .from('email_templates')
      .select('id, name, slug, subject, is_active, created_at, updated_at')
      .order('name')

    if (error) {
      console.error('Error fetching templates:', error)
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }

    return NextResponse.json({ templates: data ?? [] })
  } catch (err) {
    console.error('Admin templates GET:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/admin/emails/templates — create template
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdmin(request)
    if (auth instanceof NextResponse) return auth

    const body = await request.json().catch(() => ({}))
    const name = typeof body.name === 'string' ? body.name.trim() : ''
    const slug = typeof body.slug === 'string' ? body.slug.trim().toLowerCase().replace(/\s+/g, '-') : ''
    const subject = typeof body.subject === 'string' ? body.subject.trim() : ''
    const html_content = typeof body.html_content === 'string' ? body.html_content : ''
    const is_active = body.is_active === true

    if (!name || !slug || !subject) {
      return NextResponse.json(
        { error: 'name, slug, and subject are required' },
        { status: 400 }
      )
    }

    if (!/^[a-z0-9-_]+$/.test(slug)) {
      return NextResponse.json(
        { error: 'slug must be lowercase alphanumeric, hyphens, underscores only' },
        { status: 400 }
      )
    }

    const admin = getAdminSupabase()
    const { data, error } = await admin
      .from('email_templates')
      .insert({
        name,
        slug,
        subject,
        html_content,
        is_active,
      })
      .select('id, name, slug, subject, is_active, created_at')
      .single()

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: 'Slug already exists' }, { status: 409 })
      }
      console.error('Error creating template:', error)
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (err) {
    console.error('Admin templates POST:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
