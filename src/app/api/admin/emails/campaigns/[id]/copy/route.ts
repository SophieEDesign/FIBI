import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, getAdminSupabase } from '@/lib/admin'

export const dynamic = 'force-dynamic'

function slugifyBase(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-_]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48)
}

/**
 * POST /api/admin/emails/campaigns/[id]/copy
 * Duplicate a campaign as a new draft, including a copy of the email template HTML.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdmin(request)
    if (auth instanceof NextResponse) return auth

    const { id } = await params
    const admin = getAdminSupabase()

    const { data: source, error: findError } = await admin
      .from('email_campaigns')
      .select('*')
      .eq('id', id)
      .maybeSingle()

    if (findError) {
      console.error('campaigns copy find', findError)
      return NextResponse.json({ error: 'Failed to load campaign' }, { status: 500 })
    }
    if (!source) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const { data: template, error: templateError } = await admin
      .from('email_templates')
      .select('name, slug, subject, html_content, is_active')
      .eq('slug', source.template_slug)
      .maybeSingle()

    if (templateError || !template) {
      console.error('campaigns copy template', templateError)
      return NextResponse.json(
        { error: 'Could not copy email — template not found for this campaign' },
        { status: 400 }
      )
    }

    const stamp = Date.now().toString(36)
    const baseSlug = slugifyBase(`copy-${template.slug}`) || `copy-${stamp}`
    let newSlug = `${baseSlug}-${stamp}`
    // Ensure uniqueness if collision
    for (let i = 0; i < 5; i++) {
      const { data: existing } = await admin
        .from('email_templates')
        .select('id')
        .eq('slug', newSlug)
        .maybeSingle()
      if (!existing) break
      newSlug = `${baseSlug}-${stamp}-${i + 1}`
    }

    const templateName = template.name?.trim() || template.slug
    const { error: insertTemplateError } = await admin.from('email_templates').insert({
      name: templateName.toLowerCase().startsWith('copy of ')
        ? templateName
        : `Copy of ${templateName}`,
      slug: newSlug,
      subject: template.subject,
      html_content: template.html_content ?? '',
      is_active: false,
    })

    if (insertTemplateError) {
      console.error('campaigns copy template insert', insertTemplateError)
      return NextResponse.json({ error: 'Failed to copy email template' }, { status: 500 })
    }

    const baseName = typeof source.name === 'string' ? source.name.trim() : 'Campaign'
    const copyName = baseName.toLowerCase().startsWith('copy of ')
      ? baseName
      : `Copy of ${baseName}`

    const campaignSubject =
      (typeof source.subject === 'string' && source.subject.trim()) || template.subject

    const { data: created, error: insertError } = await admin
      .from('email_campaigns')
      .insert({
        name: copyName,
        template_slug: newSlug,
        segment_id: source.segment_id,
        filters: source.filters,
        status: 'draft',
        scheduled_at: null,
        started_at: null,
        completed_at: null,
        audience_count: 0,
        sent_count: 0,
        failed_count: 0,
        opened_count: 0,
        clicked_count: 0,
        bounced_count: 0,
        unsubscribed_count: 0,
        subject: campaignSubject,
        preview_text: source.preview_text,
        from_name: source.from_name,
        from_email: source.from_email,
      })
      .select('*')
      .single()

    if (insertError) {
      console.error('campaigns copy insert', insertError)
      // Best-effort cleanup of orphaned template copy
      await admin.from('email_templates').delete().eq('slug', newSlug)
      return NextResponse.json({ error: 'Failed to copy campaign' }, { status: 500 })
    }

    return NextResponse.json(
      {
        campaign: created,
        template: { slug: newSlug, name: `Copy of ${templateName}` },
      },
      { status: 201 }
    )
  } catch (e) {
    console.error('campaigns/[id]/copy', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
