/**
 * Campaign send runner: resolve segment/filters → rate-limited Resend loop → update campaign stats.
 */

import { getAdminSupabase } from '@/lib/admin'
import { sendEmail } from '@/lib/resend'
import {
  type AutomationConditions,
  getUsersForOneOff,
} from '@/lib/email-automations'
import { isCronAuthorized, type RunResult } from '@/lib/run-email-automations'

const MAX_CAMPAIGN_PER_RUN = 500
const DELAY_BETWEEN_SENDS_MS = 550
const FROM_EMAIL = 'hello@fibi.world'

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export { isCronAuthorized }

export type CampaignRow = {
  id: string
  name: string
  template_slug: string
  segment_id: string | null
  filters: AutomationConditions | null
  status: string
  scheduled_at: string | null
  audience_count: number
  sent_count: number
  failed_count: number
}

async function resolveCampaignFilters(
  admin: ReturnType<typeof getAdminSupabase>,
  campaign: CampaignRow
): Promise<AutomationConditions | null> {
  if (campaign.segment_id) {
    const { data: seg } = await admin
      .from('email_segments')
      .select('conditions')
      .eq('id', campaign.segment_id)
      .maybeSingle()
    if (seg?.conditions && typeof seg.conditions === 'object') {
      return seg.conditions as AutomationConditions
    }
  }
  if (campaign.filters && typeof campaign.filters === 'object') {
    return campaign.filters
  }
  return null
}

/**
 * Send a campaign. Claims status sending → sent/failed.
 */
export async function runCampaignSend(campaignId: string): Promise<RunResult> {
  const result: RunResult = {
    sent: 0,
    skipped: 0,
    failed: 0,
    errors: [],
    limitReached: false,
  }

  const admin = getAdminSupabase()

  const { data: campaign, error: campError } = await admin
    .from('email_campaigns')
    .select('*')
    .eq('id', campaignId)
    .single()

  if (campError || !campaign) {
    result.errors.push('Campaign not found')
    return result
  }

  if (!['draft', 'scheduled', 'failed'].includes(campaign.status)) {
    result.errors.push(`Cannot send campaign in status: ${campaign.status}`)
    return result
  }

  const { data: template, error: templateError } = await admin
    .from('email_templates')
    .select('subject, html_content')
    .eq('slug', campaign.template_slug)
    .single()

  if (templateError || !template) {
    result.errors.push(`Template not found: ${campaign.template_slug}`)
    await admin
      .from('email_campaigns')
      .update({ status: 'failed', completed_at: new Date().toISOString() })
      .eq('id', campaignId)
    return result
  }

  const filters = await resolveCampaignFilters(admin, campaign as CampaignRow)
  let users
  try {
    users = await getUsersForOneOff(admin, filters)
  } catch (err) {
    result.errors.push(err instanceof Error ? err.message : 'Failed to fetch recipients')
    await admin
      .from('email_campaigns')
      .update({ status: 'failed', completed_at: new Date().toISOString() })
      .eq('id', campaignId)
    return result
  }

  await admin
    .from('email_campaigns')
    .update({
      status: 'sending',
      started_at: new Date().toISOString(),
      audience_count: users.length,
      sent_count: 0,
      failed_count: 0,
    })
    .eq('id', campaignId)

  for (const user of users) {
    if (result.sent >= MAX_CAMPAIGN_PER_RUN) {
      result.limitReached = true
      result.errors.push(`Stopped: max ${MAX_CAMPAIGN_PER_RUN} emails per campaign run`)
      break
    }
    if (!user.email) {
      result.skipped += 1
      continue
    }
    try {
      const resendData = await sendEmail({
        to: user.email,
        subject: template.subject,
        html: template.html_content,
        from: FROM_EMAIL,
        userId: user.id,
      })
      await admin.from('email_logs').insert({
        user_id: user.id,
        recipient_email: user.email,
        template_slug: campaign.template_slug,
        automation_id: null,
        campaign_id: campaignId,
        status: 'sent',
        resend_email_id: resendData?.id ?? null,
      })
      result.sent += 1
      await delay(DELAY_BETWEEN_SENDS_MS)
    } catch (err) {
      result.failed += 1
      result.errors.push(`User ${user.email}: ${err instanceof Error ? err.message : String(err)}`)
      try {
        await admin.from('email_logs').insert({
          user_id: user.id,
          recipient_email: user.email,
          template_slug: campaign.template_slug,
          automation_id: null,
          campaign_id: campaignId,
          status: 'failed',
        })
      } catch {
        /* ignore */
      }
      await delay(DELAY_BETWEEN_SENDS_MS)
    }
  }

  await admin
    .from('email_campaigns')
    .update({
      status: result.failed > 0 && result.sent === 0 ? 'failed' : 'sent',
      completed_at: new Date().toISOString(),
      sent_count: result.sent,
      failed_count: result.failed,
      audience_count: users.length,
    })
    .eq('id', campaignId)

  return result
}

/**
 * Pick up due scheduled campaigns (status=scheduled, scheduled_at <= now).
 */
export async function runDueCampaigns(): Promise<{
  processed: number
  results: { campaignId: string; name: string; result: RunResult }[]
}> {
  const admin = getAdminSupabase()
  const now = new Date().toISOString()

  const { data: due, error } = await admin
    .from('email_campaigns')
    .select('id, name')
    .eq('status', 'scheduled')
    .lte('scheduled_at', now)
    .order('scheduled_at', { ascending: true })
    .limit(5)

  if (error) {
    console.error('[runDueCampaigns]', error)
    return { processed: 0, results: [] }
  }

  const results: { campaignId: string; name: string; result: RunResult }[] = []
  for (const row of due ?? []) {
    const result = await runCampaignSend(row.id)
    results.push({ campaignId: row.id, name: row.name, result })
  }

  return { processed: results.length, results }
}
