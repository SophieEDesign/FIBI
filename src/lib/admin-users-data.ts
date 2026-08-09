import type { User } from '@supabase/supabase-js'
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  buildFunnelAndInsights,
  buildWeeklyCompare,
  derivePersonState,
  type AdminPersonRow,
} from '@/lib/admin-metrics'

type ActivationRow = {
  user_id: string
  first_place_at: string | null
  last_place_at: string | null
  first_trip_at: string | null
  last_trip_at: string | null
  places_count: number
  trips_count: number
}

/**
 * Load auth users + profiles + activation for admin metrics.
 * Prefer list_admin_people SQL for paginated UI; this remains for funnel/weekly aggregates.
 */
export async function loadAllAdminPeople(adminClient: SupabaseClient): Promise<AdminPersonRow[]> {
  const perPage = 1000
  let page = 1
  const allUsers: User[] = []
  let hasMore = true
  while (hasMore) {
    const { data, error } = await adminClient.auth.admin.listUsers({ perPage, page })
    if (error) throw error
    allUsers.push(...(data.users ?? []))
    hasMore = (data.users?.length ?? 0) >= perPage
    page += 1
  }

  const { data: profiles } = await adminClient
    .from('profiles')
    .select('id, welcome_email_sent, onboarding_nudge_sent, email_verified_at')

  const profileMap = new Map<
    string,
    { welcome_email_sent: boolean; onboarding_nudge_sent: boolean; email_verified_at: string | null }
  >()
  profiles?.forEach((p) => {
    profileMap.set(p.id, {
      welcome_email_sent: p.welcome_email_sent ?? false,
      onboarding_nudge_sent: p.onboarding_nudge_sent ?? false,
      email_verified_at: p.email_verified_at ?? null,
    })
  })

  const { data: activationStats } = await adminClient
    .from('admin_activation_stats')
    .select('user_id, first_place_at, last_place_at, first_trip_at, last_trip_at, places_count, trips_count')

  const activationMap = new Map<string, ActivationRow>()
  ;(activationStats as ActivationRow[] | null)?.forEach((row) => {
    activationMap.set(row.user_id, row)
  })

  const usersData: AdminPersonRow[] = allUsers.map((authUser) => {
    const profile = profileMap.get(authUser.id)
    const emailConfirmedAt = profile?.email_verified_at ?? authUser.email_confirmed_at ?? null
    const act = activationMap.get(authUser.id)
    const lastLoginAt = authUser.last_sign_in_at ?? null
    const dates = [lastLoginAt, act?.last_place_at ?? null, act?.last_trip_at ?? null].filter(
      Boolean
    ) as string[]
    const lastActivityAt =
      dates.length > 0
        ? new Date(Math.max(...dates.map((d) => new Date(d).getTime()))).toISOString()
        : null
    const placesCount = act?.places_count ?? 0
    return {
      id: authUser.id,
      email: authUser.email ?? null,
      email_confirmed_at: emailConfirmedAt,
      created_at: authUser.created_at,
      last_login_at: lastLoginAt,
      first_place_added_at: act?.first_place_at ?? null,
      first_trip_created_at: act?.first_trip_at ?? null,
      last_activity_at: lastActivityAt,
      places_count: placesCount,
      trips_count: act?.trips_count ?? 0,
      welcome_email_sent: profile?.welcome_email_sent ?? false,
      onboarding_nudge_sent: profile?.onboarding_nudge_sent ?? false,
      state: derivePersonState({
        email_confirmed_at: emailConfirmedAt,
        places_count: placesCount,
        last_login_at: lastLoginAt,
      }),
    }
  })

  usersData.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  return usersData
}

export function metricsFromPeople(people: AdminPersonRow[]) {
  const metricUsers = people.map((u) => ({
    created_at: u.created_at,
    email_confirmed_at: u.email_confirmed_at,
    last_login_at: u.last_login_at,
    first_place_added_at: u.first_place_added_at,
    places_count: u.places_count,
    trips_count: u.trips_count ?? 0,
    last_activity_at: u.last_activity_at ?? null,
  }))
  return {
    ...buildFunnelAndInsights(metricUsers),
    weekly: buildWeeklyCompare(metricUsers),
  }
}
