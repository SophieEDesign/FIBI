/**
 * Email automation evaluation and user querying.
 * Modular: evaluation logic separate from sending logic.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type { User } from '@supabase/supabase-js'

export type AutomationConditions = {
  confirmed?: boolean
  places_count_gt?: number
  places_count_lt?: number
  last_login_days_gt?: number
  created_days_gt?: number
  created_days_lt?: number
  itineraries_count_gt?: number
  founding_followup_sent?: boolean
}

export type AutomationRow = {
  id: string
  name: string
  template_slug: string
  trigger_type: string
  conditions: AutomationConditions | null
  delay_hours: number
}

export type TemplateRow = {
  id: string
  slug: string
  subject: string
  html_content: string
}

export type UserWithStats = {
  id: string
  email: string | null
  created_at: string
  last_sign_in_at: string | null
  email_confirmed_at: string | null
  places_count: number
  itineraries_count: number
  founding_followup_sent: boolean
  marketing_opt_in: boolean
}

const MS_PER_HOUR = 60 * 60 * 1000
const MS_PER_DAY = 24 * MS_PER_HOUR

function daysSince(dateStr: string | null): number | null {
  if (!dateStr) return null
  const d = new Date(dateStr).getTime()
  return Math.floor((Date.now() - d) / MS_PER_DAY)
}

/**
 * Evaluate whether a user matches the given conditions.
 */
export function evaluateUserConditions(
  user: UserWithStats,
  conditions: AutomationConditions | null | undefined
): boolean {
  if (!conditions) return true

  if (typeof conditions.confirmed === 'boolean') {
    const isConfirmed = user.email_confirmed_at != null
    if (conditions.confirmed !== isConfirmed) return false
  }

  if (typeof conditions.places_count_gt === 'number') {
    if ((user.places_count ?? 0) <= conditions.places_count_gt) return false
  }

  if (typeof conditions.places_count_lt === 'number') {
    if ((user.places_count ?? 0) >= conditions.places_count_lt) return false
  }

  if (typeof conditions.last_login_days_gt === 'number') {
    const days = daysSince(user.last_sign_in_at)
    if (days === null) return false // never logged in
    if (days <= conditions.last_login_days_gt) return false
  }

  if (typeof conditions.created_days_gt === 'number') {
    const days = daysSince(user.created_at)
    if (days === null || days <= conditions.created_days_gt) return false
  }

  if (typeof conditions.created_days_lt === 'number') {
    const days = daysSince(user.created_at)
    if (days === null || days >= conditions.created_days_lt) return false
  }

  if (typeof conditions.itineraries_count_gt === 'number') {
    if ((user.itineraries_count ?? 0) <= conditions.itineraries_count_gt) return false
  }

  if (typeof conditions.founding_followup_sent === 'boolean') {
    if (conditions.founding_followup_sent !== user.founding_followup_sent) return false
  }

  return true
}

/**
 * Filter users by trigger_type (coarse filter before conditions).
 */
function matchesTrigger(user: UserWithStats, triggerType: string): boolean {
  switch (triggerType) {
    case 'user_confirmed':
      return user.email_confirmed_at != null
    case 'user_inactive':
      const loginDays = daysSince(user.last_sign_in_at)
      return loginDays !== null && loginDays > 0
    case 'place_added':
      return (user.places_count ?? 0) > 0
    case 'itinerary_created':
      return (user.itineraries_count ?? 0) > 0
    case 'manual':
      return true
    default:
      return true
  }
}

/**
 * Apply delay_hours: user must have been created/confirmed long enough ago.
 */
function passesDelay(user: UserWithStats, delayHours: number): boolean {
  if (delayHours <= 0) return true
  const created = new Date(user.created_at).getTime()
  const cutoff = Date.now() - delayHours * MS_PER_HOUR
  return created <= cutoff
}

/**
 * Fetch all users with stats (places_count, itineraries_count).
 */
export async function fetchUsersWithStats(
  adminClient: SupabaseClient
): Promise<UserWithStats[]> {
  const perPage = 1000
  let page = 1
  const allUsers: User[] = []
  let hasMore = true

  while (hasMore) {
    const { data, error } = await adminClient.auth.admin.listUsers({ perPage, page })
    if (error) throw new Error(`Failed to list users: ${error.message}`)
    allUsers.push(...(data.users ?? []))
    hasMore = (data.users?.length ?? 0) >= perPage
    page += 1
  }

  const { data: placeStats } = await adminClient
    .from('saved_items')
    .select('user_id')
  const placeCounts = new Map<string, number>()
  placeStats?.forEach((r: { user_id: string }) => {
    placeCounts.set(r.user_id, (placeCounts.get(r.user_id) ?? 0) + 1)
  })

  const { data: itineraryStats } = await adminClient
    .from('itineraries')
    .select('user_id')
  const itineraryCounts = new Map<string, number>()
  itineraryStats?.forEach((r: { user_id: string }) => {
    itineraryCounts.set(r.user_id, (itineraryCounts.get(r.user_id) ?? 0) + 1)
  })

  const { data: profiles } = await adminClient
    .from('profiles')
    .select('id, founding_followup_sent, email_verified_at, marketing_opt_in')
  const foundingMap = new Map<string, boolean>()
  const emailVerifiedMap = new Map<string, string | null>()
  const marketingOptInMap = new Map<string, boolean>()
  profiles?.forEach((p: { id: string; founding_followup_sent: boolean | null; email_verified_at: string | null; marketing_opt_in?: boolean | null }) => {
    foundingMap.set(p.id, p.founding_followup_sent ?? false)
    emailVerifiedMap.set(p.id, p.email_verified_at ?? null)
    marketingOptInMap.set(p.id, p.marketing_opt_in ?? false)
  })

  return allUsers.map((u) => {
    const profileVerified = emailVerifiedMap.get(u.id)
    const verifiedAt = u.email_confirmed_at ?? profileVerified ?? null
    return {
    id: u.id,
    email: u.email ?? null,
    created_at: u.created_at ?? new Date().toISOString(),
    last_sign_in_at: u.last_sign_in_at ?? null,
    email_confirmed_at: verifiedAt,
    places_count: placeCounts.get(u.id) ?? 0,
    itineraries_count: itineraryCounts.get(u.id) ?? 0,
    founding_followup_sent: foundingMap.get(u.id) ?? false,
    marketing_opt_in: marketingOptInMap.get(u.id) ?? false,
  }})
}

/**
 * Get users eligible for an automation (trigger + conditions + delay).
 * Does NOT check email_logs or throttle — caller must do that.
 */
export async function getUsersForAutomation(
  adminClient: SupabaseClient,
  automation: AutomationRow,
  allUsers: UserWithStats[]
): Promise<UserWithStats[]> {
  const conditions = (automation.conditions ?? {}) as AutomationConditions
  return allUsers.filter(
    (u) =>
      u.email &&
      u.marketing_opt_in &&
      matchesTrigger(u, automation.trigger_type) &&
      passesDelay(u, automation.delay_hours) &&
      evaluateUserConditions(u, conditions)
  )
}
