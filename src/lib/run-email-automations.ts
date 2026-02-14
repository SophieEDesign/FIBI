/**
 * Core logic for running email automations.
 * Used by both cron endpoint and admin manual trigger.
 * Keeps evaluation logic separate from sending logic.
 */

import { getAdminSupabase } from '@/lib/admin'
import { sendEmail } from '@/lib/resend'
import {
  type UserWithStats,
  type AutomationRow,
  type TemplateRow,
  fetchUsersWithStats,
  getUsersForAutomation,
} from '@/lib/email-automations'

const MAX_SEND_PER_RUN = 200
const THROTTLE_HOURS = 48
const MS_PER_HOUR = 60 * 60 * 1000
const FROM_EMAIL = 'hello@fibi.world'

export type RunResult = {
  sent: number
  skipped: number
  failed: number
  errors: string[]
  limitReached: boolean
}

function verifyCronKey(request: Request): boolean {
  const key = process.env.CRON_KEY
  const secret = process.env.CRON_SECRET
  const validToken = key || secret
  if (!validToken || validToken.length < 16) return false
  const auth = request.headers.get('Authorization')
  if (!auth?.startsWith('Bearer ')) return false
  const provided = auth.slice(7).trim()
  return provided === key || provided === secret
}

export function isCronAuthorized(request: Request): boolean {
  return verifyCronKey(request)
}

/**
 * Fetch users who received any automation email in the last 48 hours.
 */
async function getThrottledUserIds(
  adminClient: ReturnType<typeof getAdminSupabase>
): Promise<Set<string>> {
  const cutoff = new Date(Date.now() - THROTTLE_HOURS * MS_PER_HOUR).toISOString()
  const { data, error } = await adminClient
    .from('email_logs')
    .select('user_id')
    .gte('sent_at', cutoff)

  if (error) {
    console.error('Error fetching email_logs for throttle:', error)
    return new Set()
  }

  return new Set((data ?? []).map((r: { user_id: string }) => r.user_id))
}

/**
 * Fetch users who have already received this template (in last 48h, for duplicate prevention).
 * Combined with throttle: we skip if user has ANY automation email in 48h.
 */
async function getUsersWhoReceivedTemplate(
  adminClient: ReturnType<typeof getAdminSupabase>,
  templateSlug: string
): Promise<Set<string>> {
  const cutoff = new Date(Date.now() - THROTTLE_HOURS * MS_PER_HOUR).toISOString()
  const { data, error } = await adminClient
    .from('email_logs')
    .select('user_id')
    .eq('template_slug', templateSlug)
    .gte('sent_at', cutoff)

  if (error) {
    console.error('Error fetching email_logs for template:', error)
    return new Set()
  }

  return new Set((data ?? []).map((r: { user_id: string }) => r.user_id))
}

/**
 * Run a single automation by ID. Used for "Run now" on automations page.
 * Respects same throttle, limit, and logging as runEmailAutomations.
 */
export async function runSingleAutomation(automationId: string): Promise<RunResult> {
  const result: RunResult = {
    sent: 0,
    skipped: 0,
    failed: 0,
    errors: [],
    limitReached: false,
  }

  const adminClient = getAdminSupabase()

  const { data: automation, error: autoError } = await adminClient
    .from('email_automations')
    .select('*')
    .eq('id', automationId)
    .eq('is_active', true)
    .single()

  if (autoError || !automation) {
    result.errors.push('Automation not found or inactive')
    return result
  }

  const { data: template } = await adminClient
    .from('email_templates')
    .select('subject, html_content')
    .eq('slug', automation.template_slug)
    .single()

  if (!template) {
    result.errors.push(`Template not found: ${automation.template_slug}`)
    return result
  }

  const allUsers = await fetchUsersWithStats(adminClient)
  const candidates = await getUsersForAutomation(adminClient, automation as AutomationRow, allUsers)
  const throttledIds = await getThrottledUserIds(adminClient)
  const templateSentIds = await getUsersWhoReceivedTemplate(adminClient, automation.template_slug)

  for (const user of candidates) {
    if (result.sent >= MAX_SEND_PER_RUN) {
      result.limitReached = true
      result.errors.push(`Stopped: max ${MAX_SEND_PER_RUN} emails per run reached`)
      break
    }
    if (throttledIds.has(user.id) || templateSentIds.has(user.id)) {
      result.skipped += 1
      continue
    }
    if (!user.email) {
      result.skipped += 1
      continue
    }
    try {
      await sendEmail({
        to: user.email,
        subject: template.subject,
        html: template.html_content,
        from: FROM_EMAIL,
      })
      await adminClient.from('email_logs').insert({
        user_id: user.id,
        template_slug: automation.template_slug,
        automation_id: automation.id,
        status: 'sent',
      })
      throttledIds.add(user.id)
      templateSentIds.add(user.id)
      result.sent += 1
    } catch (err) {
      result.failed += 1
      result.errors.push(`User ${user.email}: ${err instanceof Error ? err.message : String(err)}`)
      try {
        await adminClient.from('email_logs').insert({
          user_id: user.id,
          template_slug: automation.template_slug,
          automation_id: automation.id,
          status: 'failed',
        })
      } catch {
        /* ignore */
      }
    }
  }

  return result
}

/**
 * Run all active email automations (excluding manual).
 */
export async function runEmailAutomations(): Promise<RunResult> {
  const result: RunResult = {
    sent: 0,
    skipped: 0,
    failed: 0,
    errors: [],
    limitReached: false,
  }

  const adminClient = getAdminSupabase()

  const { data: automations, error: autoError } = await adminClient
    .from('email_automations')
    .select('*')
    .eq('is_active', true)
    .neq('trigger_type', 'manual')

  if (autoError) {
    result.errors.push(`Failed to fetch automations: ${autoError.message}`)
    console.error('email-automations: fetch automations error', autoError)
    return result
  }

  if (!automations?.length) {
    return result
  }

  const { data: templates, error: templateError } = await adminClient
    .from('email_templates')
    .select('id, slug, subject, html_content')

  if (templateError || !templates?.length) {
    result.errors.push(templateError ? `Failed to fetch templates: ${templateError.message}` : 'No templates found')
    return result
  }

  const templateMap = new Map<string, TemplateRow>()
  templates.forEach((t: TemplateRow) => templateMap.set(t.slug, t))

  let allUsers: UserWithStats[] | null = null

  for (const automation of automations as AutomationRow[]) {
    const template = templateMap.get(automation.template_slug)
    if (!template) {
      result.errors.push(`Template not found: ${automation.template_slug}`)
      continue
    }

    if (result.sent >= MAX_SEND_PER_RUN) {
      result.limitReached = true
      result.errors.push(`Stopped: max ${MAX_SEND_PER_RUN} emails per run reached`)
      break
    }

    if (!allUsers) {
      try {
        allUsers = await fetchUsersWithStats(adminClient)
      } catch (err) {
        result.errors.push(`Failed to fetch users: ${err instanceof Error ? err.message : 'Unknown error'}`)
        break
      }
    }

    const candidates = await getUsersForAutomation(adminClient, automation, allUsers)
    const throttledIds = await getThrottledUserIds(adminClient)
    const templateSentIds = await getUsersWhoReceivedTemplate(adminClient, automation.template_slug)

    for (const user of candidates) {
      if (result.sent >= MAX_SEND_PER_RUN) {
        result.limitReached = true
        result.errors.push(`Stopped: max ${MAX_SEND_PER_RUN} emails per run reached`)
        break
      }

      if (throttledIds.has(user.id) || templateSentIds.has(user.id)) {
        result.skipped += 1
        continue
      }

      if (!user.email) {
        result.skipped += 1
        continue
      }

      try {
        await sendEmail({
          to: user.email,
          subject: template.subject,
          html: template.html_content,
          from: FROM_EMAIL,
        })

        await adminClient.from('email_logs').insert({
          user_id: user.id,
          template_slug: automation.template_slug,
          automation_id: automation.id,
          status: 'sent',
        })

        throttledIds.add(user.id)
        templateSentIds.add(user.id)
        result.sent += 1
      } catch (err) {
        result.failed += 1
        const msg = err instanceof Error ? err.message : String(err)
        result.errors.push(`User ${user.email}: ${msg}`)

        try {
          await adminClient.from('email_logs').insert({
            user_id: user.id,
            template_slug: automation.template_slug,
            automation_id: automation.id,
            status: 'failed',
          })
        } catch (logErr) {
          console.error('Failed to log failed send:', logErr)
        }
      }
    }
  }

  return result
}
