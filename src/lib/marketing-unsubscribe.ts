import { getAdminSupabase } from '@/lib/admin'

/**
 * Opt a user out of marketing email: set marketing_opt_in false and stamp recent sends.
 * Returns whether the profile was updated.
 */
export async function applyMarketingUnsubscribe(userId: string): Promise<{ ok: boolean; alreadyOptedOut: boolean }> {
  const admin = getAdminSupabase()

  const { data: profile, error: profileError } = await admin
    .from('profiles')
    .select('marketing_opt_in')
    .eq('id', userId)
    .maybeSingle()

  if (profileError || !profile) {
    console.error('[unsubscribe] profile lookup', profileError)
    return { ok: false, alreadyOptedOut: false }
  }

  const alreadyOptedOut = profile.marketing_opt_in === false

  if (!alreadyOptedOut) {
    const { error: updateError } = await admin
      .from('profiles')
      .update({ marketing_opt_in: false, updated_at: new Date().toISOString() })
      .eq('id', userId)

    if (updateError) {
      console.error('[unsubscribe] profile update', updateError)
      return { ok: false, alreadyOptedOut: false }
    }
  }

  const now = new Date().toISOString()
  const since = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()

  const { data: recentLogs } = await admin
    .from('email_logs')
    .select('id, campaign_id')
    .eq('user_id', userId)
    .eq('status', 'sent')
    .is('unsubscribed_at', null)
    .gte('sent_at', since)

  if (recentLogs?.length) {
    const ids = recentLogs.map((r: { id: string }) => r.id)
    await admin.from('email_logs').update({ unsubscribed_at: now }).in('id', ids)

    const campaignIds = [
      ...new Set(
        recentLogs
          .map((r: { campaign_id: string | null }) => r.campaign_id)
          .filter((id): id is string => typeof id === 'string')
      ),
    ]
    for (const campaignId of campaignIds) {
      const { data: camp } = await admin
        .from('email_campaigns')
        .select('unsubscribed_count')
        .eq('id', campaignId)
        .maybeSingle()
      if (camp) {
        await admin
          .from('email_campaigns')
          .update({ unsubscribed_count: (camp.unsubscribed_count ?? 0) + 1 })
          .eq('id', campaignId)
      }
    }
  }

  return { ok: true, alreadyOptedOut }
}
