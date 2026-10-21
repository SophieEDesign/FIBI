import { getAdminSupabase } from '@/lib/admin'

export type OptOutSource = 'unsubscribe' | 'preferences' | 'complaint' | 'bounce' | 'admin'

function normaliseEmail(email: string): string {
  return email.trim().toLowerCase()
}

/**
 * Opt a user out of marketing email permanently by user id.
 * Writes email_opt_outs (PECR record), sets profiles.marketing_opt_in = false,
 * and stamps recent email_logs / campaign counts.
 */
export async function applyMarketingUnsubscribe(
  userId: string,
  source: OptOutSource = 'unsubscribe'
): Promise<{ ok: boolean; alreadyOptedOut: boolean }> {
  const admin = getAdminSupabase()
  const now = new Date().toISOString()

  const { data: authData, error: authError } = await admin.auth.admin.getUserById(userId)
  if (authError) {
    console.error('[unsubscribe] auth lookup', authError)
  }
  const emailRaw = authData?.user?.email ?? null
  const email = emailRaw ? normaliseEmail(emailRaw) : null

  const { data: profile, error: profileError } = await admin
    .from('profiles')
    .select('marketing_opt_in')
    .eq('id', userId)
    .maybeSingle()

  if (profileError) {
    console.error('[unsubscribe] profile lookup', profileError)
    return { ok: false, alreadyOptedOut: false }
  }

  let alreadyOptedOut = profile?.marketing_opt_in === false

  if (email) {
    const { data: existingOptOut } = await admin
      .from('email_opt_outs')
      .select('email')
      .eq('email', email)
      .maybeSingle()
    if (existingOptOut) alreadyOptedOut = true

    const { error: optOutError } = await admin.from('email_opt_outs').upsert(
      {
        email,
        user_id: userId,
        opted_out_at: now,
        source,
      },
      { onConflict: 'email' }
    )
    if (optOutError) {
      console.error('[unsubscribe] email_opt_outs upsert', optOutError)
      return { ok: false, alreadyOptedOut: false }
    }
  }

  if (profile) {
    if (profile.marketing_opt_in !== false) {
      const { error: updateError } = await admin
        .from('profiles')
        .update({
          marketing_opt_in: false,
          marketing_opted_out_at: now,
          updated_at: now,
        })
        .eq('id', userId)

      if (updateError) {
        console.error('[unsubscribe] profile update', updateError)
        return { ok: false, alreadyOptedOut: false }
      }
    } else if (!profile.marketing_opt_in) {
      // Ensure timestamp exists even if already opted out
      await admin
        .from('profiles')
        .update({ marketing_opted_out_at: now, updated_at: now })
        .eq('id', userId)
        .is('marketing_opted_out_at', null)
    }
  } else {
    // Profile row missing — still create a minimal opt-out marker on profiles if possible
    const { error: insertError } = await admin.from('profiles').upsert(
      {
        id: userId,
        marketing_opt_in: false,
        marketing_opted_out_at: now,
        updated_at: now,
      },
      { onConflict: 'id' }
    )
    if (insertError) {
      console.error('[unsubscribe] profile upsert', insertError)
      // email_opt_outs may still have been written — treat as partial success if email stored
      if (!email) return { ok: false, alreadyOptedOut: false }
    }
  }

  // Without an email and without a profile write, we have no durable record
  if (!email && !profile) {
    console.error('[unsubscribe] no email and no profile for', userId)
    return { ok: false, alreadyOptedOut: false }
  }

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

/**
 * Explicit re-consent: clear suppression list entry and turn marketing back on.
 */
export async function applyMarketingOptIn(userId: string): Promise<{ ok: boolean }> {
  const admin = getAdminSupabase()
  const now = new Date().toISOString()

  const { data: authData } = await admin.auth.admin.getUserById(userId)
  const email = authData?.user?.email ? normaliseEmail(authData.user.email) : null

  if (email) {
    const { error: deleteError } = await admin.from('email_opt_outs').delete().eq('email', email)
    if (deleteError) {
      console.error('[opt-in] email_opt_outs delete', deleteError)
      return { ok: false }
    }
  }

  const { error: updateError } = await admin
    .from('profiles')
    .update({
      marketing_opt_in: true,
      marketing_opted_out_at: null,
      updated_at: now,
    })
    .eq('id', userId)

  if (updateError) {
    console.error('[opt-in] profile update', updateError)
    return { ok: false }
  }

  return { ok: true }
}

/** True if this email is on the suppression list. */
export async function isEmailOptedOut(email: string): Promise<boolean> {
  const normalised = normaliseEmail(email)
  if (!normalised) return false
  const admin = getAdminSupabase()
  const { data } = await admin
    .from('email_opt_outs')
    .select('email')
    .eq('email', normalised)
    .maybeSingle()
  return !!data
}

/** Load the full suppression set (lowercased emails) for batch sends. */
export async function loadOptedOutEmailSet(): Promise<Set<string>> {
  const admin = getAdminSupabase()
  const { data, error } = await admin.from('email_opt_outs').select('email')
  if (error) {
    console.error('[opt-out] load set', error)
    return new Set()
  }
  return new Set((data ?? []).map((r: { email: string }) => normaliseEmail(r.email)))
}
