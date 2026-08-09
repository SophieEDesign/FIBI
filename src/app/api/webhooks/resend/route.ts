import { NextRequest, NextResponse } from 'next/server'
import { Webhook } from 'svix'
import { getAdminSupabase } from '@/lib/admin'

export const dynamic = 'force-dynamic'

type ResendWebhookBody = {
  type?: string
  data?: {
    email_id?: string
    created_at?: string
    click?: { link?: string; timestamp?: string; ipAddress?: string; userAgent?: string }
  }
}

async function findLogByResendId(emailId: string) {
  const admin = getAdminSupabase()
  const { data, error } = await admin
    .from('email_logs')
    .select('id, user_id, campaign_id, opened_at, bounced_at, complained_at, delivered_at')
    .eq('resend_email_id', emailId)
    .maybeSingle()
  if (error) {
    console.error('[webhooks/resend] Find log:', error)
    return null
  }
  return data as {
    id: string
    user_id: string
    campaign_id: string | null
    opened_at: string | null
    bounced_at: string | null
    complained_at: string | null
    delivered_at: string | null
  } | null
}

async function bumpCampaignCount(
  campaignId: string | null,
  column: 'opened_count' | 'clicked_count' | 'bounced_count' | 'unsubscribed_count'
) {
  if (!campaignId) return
  const admin = getAdminSupabase()
  const { data: camp } = await admin
    .from('email_campaigns')
    .select(column)
    .eq('id', campaignId)
    .maybeSingle()
  if (!camp) return
  const current = (camp as Record<string, number | null>)[column] ?? 0
  await admin
    .from('email_campaigns')
    .update({ [column]: current + 1 })
    .eq('id', campaignId)
}

async function suppressMarketing(userId: string) {
  const admin = getAdminSupabase()
  await admin
    .from('profiles')
    .update({ marketing_opt_in: false, updated_at: new Date().toISOString() })
    .eq('id', userId)
}

/**
 * POST /api/webhooks/resend
 * Handles email.clicked, email.opened, email.bounced, email.complained, email.delivered.
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

  let body: ResendWebhookBody
  try {
    body = JSON.parse(payload) as ResendWebhookBody
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const type = body.type
  const emailId = body.data?.email_id
  if (!type || !emailId) {
    return NextResponse.json({ ok: true })
  }

  const admin = getAdminSupabase()
  const logRow = await findLogByResendId(emailId)
  if (!logRow) {
    return NextResponse.json({ ok: true })
  }

  const eventAt = body.data?.created_at ?? new Date().toISOString()

  if (type === 'email.clicked' && body.data?.click) {
    const click = body.data.click
    const { error: insertError } = await admin.from('email_link_clicks').insert({
      email_log_id: logRow.id,
      link_url: click.link ?? '',
      clicked_at: click.timestamp ?? eventAt,
      ip_address: click.ipAddress ?? null,
      user_agent: click.userAgent ?? null,
    })
    if (insertError) {
      console.error('[webhooks/resend] Insert click:', insertError)
      return NextResponse.json({ error: 'Failed to store click' }, { status: 500 })
    }
    await bumpCampaignCount(logRow.campaign_id, 'clicked_count')
    return NextResponse.json({ ok: true })
  }

  if (type === 'email.opened') {
    if (!logRow.opened_at) {
      await admin.from('email_logs').update({ opened_at: eventAt }).eq('id', logRow.id)
      await bumpCampaignCount(logRow.campaign_id, 'opened_count')
    }
    return NextResponse.json({ ok: true })
  }

  if (type === 'email.delivered') {
    if (!logRow.delivered_at) {
      await admin.from('email_logs').update({ delivered_at: eventAt }).eq('id', logRow.id)
    }
    return NextResponse.json({ ok: true })
  }

  if (type === 'email.bounced') {
    if (!logRow.bounced_at) {
      await admin.from('email_logs').update({ bounced_at: eventAt }).eq('id', logRow.id)
      await bumpCampaignCount(logRow.campaign_id, 'bounced_count')
    }
    await suppressMarketing(logRow.user_id)
    return NextResponse.json({ ok: true })
  }

  if (type === 'email.complained') {
    if (!logRow.complained_at) {
      await admin.from('email_logs').update({ complained_at: eventAt }).eq('id', logRow.id)
      await bumpCampaignCount(logRow.campaign_id, 'bounced_count')
    }
    await suppressMarketing(logRow.user_id)
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ ok: true })
}
