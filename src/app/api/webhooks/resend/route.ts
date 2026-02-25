import { NextRequest, NextResponse } from 'next/server'
import { Webhook } from 'svix'
import { getAdminSupabase } from '@/lib/admin'

export const dynamic = 'force-dynamic'

/**
 * POST /api/webhooks/resend
 * Resend webhook receiver. Verifies Svix signature, then handles email.clicked by
 * storing in email_link_clicks. Set RESEND_WEBHOOK_SECRET in env and add this URL in Resend Dashboard.
 */
export async function POST(request: NextRequest) {
  const secret = process.env.RESEND_WEBHOOK_SECRET
  if (!secret || !secret.startsWith('whsec_')) {
    console.error('[webhooks/resend] RESEND_WEBHOOK_SECRET not set or invalid')
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 501 })
  }

  let payload: string
  try {
    payload = await request.text()
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  const id = request.headers.get('svix-id')
  const timestamp = request.headers.get('svix-timestamp')
  const signature = request.headers.get('svix-signature')
  if (!id || !timestamp || !signature) {
    return NextResponse.json({ error: 'Missing Svix headers' }, { status: 400 })
  }

  try {
    const wh = new Webhook(secret)
    wh.verify(payload, {
      'svix-id': id,
      'svix-timestamp': timestamp,
      'svix-signature': signature,
    })
  } catch (err) {
    console.error('[webhooks/resend] Verify failed:', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  let body: { type?: string; data?: { email_id?: string; click?: { link?: string; timestamp?: string; ipAddress?: string; userAgent?: string } } }
  try {
    body = JSON.parse(payload) as typeof body
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (body.type !== 'email.clicked' || !body.data?.email_id || !body.data?.click) {
    return NextResponse.json({ ok: true })
  }

  const { email_id, click } = body.data
  const admin = getAdminSupabase()

  const { data: logRow, error: findError } = await admin
    .from('email_logs')
    .select('id')
    .eq('resend_email_id', email_id)
    .maybeSingle()

  if (findError || !logRow) {
    if (findError) console.error('[webhooks/resend] Find log:', findError)
    return NextResponse.json({ ok: true })
  }

  const { error: insertError } = await admin.from('email_link_clicks').insert({
    email_log_id: logRow.id,
    link_url: click.link ?? '',
    clicked_at: click.timestamp ?? new Date().toISOString(),
    ip_address: click.ipAddress ?? null,
    user_agent: click.userAgent ?? null,
  })

  if (insertError) {
    console.error('[webhooks/resend] Insert click:', insertError)
    return NextResponse.json({ error: 'Failed to store click' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
