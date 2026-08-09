import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, getAdminSupabase } from '@/lib/admin'

export const dynamic = 'force-dynamic'

/**
 * POST /api/admin/emails/campaigns/[id]/copy
 * Duplicate a campaign as a new draft (Mailchimp-style replicate).
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

    const baseName = typeof source.name === 'string' ? source.name.trim() : 'Campaign'
    const copyName = baseName.toLowerCase().startsWith('copy of ')
      ? baseName
      : `Copy of ${baseName}`

    const { data: created, error: insertError } = await admin
      .from('email_campaigns')
      .insert({
        name: copyName,
        template_slug: source.template_slug,
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
        subject: source.subject,
        preview_text: source.preview_text,
        from_name: source.from_name,
        from_email: source.from_email,
      })
      .select('*')
      .single()

    if (insertError) {
      console.error('campaigns copy insert', insertError)
      return NextResponse.json({ error: 'Failed to copy campaign' }, { status: 500 })
    }

    return NextResponse.json({ campaign: created }, { status: 201 })
  } catch (e) {
    console.error('campaigns/[id]/copy', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
