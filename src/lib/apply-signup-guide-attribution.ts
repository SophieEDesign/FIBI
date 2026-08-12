import type { SupabaseClient } from '@supabase/supabase-js'

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

/**
 * Resolve a travel guide id from a slug or uuid string.
 */
export async function resolveGuideId(
  admin: SupabaseClient,
  slugOrId: string
): Promise<string | null> {
  const trimmed = slugOrId.trim()
  if (!trimmed) return null

  if (UUID_RE.test(trimmed)) {
    const { data } = await admin
      .from('travel_guides')
      .select('id')
      .eq('id', trimmed)
      .maybeSingle()
    return data?.id ?? null
  }

  const { data } = await admin
    .from('travel_guides')
    .select('id')
    .eq('slug', trimmed)
    .maybeSingle()
  return data?.id ?? null
}

/**
 * Write signup guide attribution once per profile (first touch wins).
 */
export async function applySignupGuideAttribution(
  admin: SupabaseClient,
  userId: string,
  slugOrId: string | null | undefined
): Promise<void> {
  if (!slugOrId?.trim()) return

  const guideId = await resolveGuideId(admin, slugOrId)
  if (!guideId) return

  const { data: profile } = await admin
    .from('profiles')
    .select('signup_guide_id')
    .eq('id', userId)
    .maybeSingle()

  if (profile?.signup_guide_id) return

  await admin
    .from('profiles')
    .update({
      signup_guide_id: guideId,
      signup_guide_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId)
    .is('signup_guide_id', null)
}
