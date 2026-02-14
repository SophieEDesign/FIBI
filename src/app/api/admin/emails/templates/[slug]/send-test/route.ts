import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, getAdminSupabase } from '@/lib/admin'
import { sendEmail } from '@/lib/resend'
import { wrapEmailWithLayout } from '@/lib/email-layout'

export const dynamic = 'force-dynamic'

const FROM_EMAIL = 'hello@fibi.world'

/**
 * POST /api/admin/emails/templates/[slug]/send-test — send test email
 * Body: { to: string }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const auth = await requireAdmin(request)
    if (auth instanceof NextResponse) return auth

    const { slug } = await params
    if (!slug) {
      return NextResponse.json({ error: 'Slug required' }, { status: 400 })
    }

    const body = await request.json().catch(() => ({}))
    const to = typeof body.to === 'string' ? body.to.trim() : ''

    if (!to || !to.includes('@')) {
      return NextResponse.json({ error: 'Valid email address required in body.to' }, { status: 400 })
    }

    const admin = getAdminSupabase()
    const { data: template, error: fetchError } = await admin
      .from('email_templates')
      .select('subject, html_content')
      .eq('slug', slug)
      .single()

    if (fetchError || !template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 })
    }

    const html = wrapEmailWithLayout(template.html_content)
    await sendEmail({
      to,
      subject: `[Test] ${template.subject}`,
      html,
      from: FROM_EMAIL,
    })

    return NextResponse.json({ success: true, message: `Test email sent to ${to}` })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to send'
    console.error('Admin send-test:', err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
