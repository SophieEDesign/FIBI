import { NextRequest, NextResponse } from 'next/server'
import type { User } from '@supabase/supabase-js'
import { requireAdmin, getAdminSupabase } from '@/lib/admin'
import type { FunnelStage, InsightSummary } from '@/lib/admin-metrics'
import { FUNNEL_STAGE_LABELS } from '@/lib/admin-metrics'

export const dynamic = 'force-dynamic'

const FUNNEL_KEYS = [
  'signed_up',
  'email_confirmed',
  'logged_in',
  'saved_first_place',
  'created_first_trip',
  'active_last_7_days',
] as const

function getIsoWeekKey(date: Date): string {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() + 4 - (d.getDay() || 7))
  const yearStart = new Date(d.getFullYear(), 0, 1)
  const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
  return `${d.getFullYear()}-W${String(weekNo).padStart(2, '0')}`
}

/**
 * Admin API route to fetch user data, activation funnel, and product health insights.
 * GET /api/admin/users
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdmin(request)
    if (auth instanceof NextResponse) return auth

    const adminClient = getAdminSupabase()

    const perPage = 1000
    let page = 1
    const allUsers: User[] = []
    let hasMore = true
    while (hasMore) {
      const { data, error: authUsersError } = await adminClient.auth.admin.listUsers({ perPage, page })
      if (authUsersError) {
        console.error('Error fetching auth users:', authUsersError)
        return NextResponse.json(
          { error: 'Failed to fetch users' },
          { status: 500 }
        )
      }
      allUsers.push(...(data.users ?? []))
      hasMore = (data.users?.length ?? 0) >= perPage
      page += 1
    }

    const { data: profiles, error: profilesError } = await adminClient
      .from('profiles')
      .select('id, welcome_email_sent, onboarding_nudge_sent, email_verified_at')

    if (profilesError) console.error('Error fetching profiles:', profilesError)

    const profileMap = new Map<string, { welcome_email_sent: boolean; onboarding_nudge_sent: boolean; email_verified_at: string | null }>()
    if (profiles) {
      profiles.forEach((p) => {
        profileMap.set(p.id, {
          welcome_email_sent: p.welcome_email_sent ?? false,
          onboarding_nudge_sent: p.onboarding_nudge_sent ?? false,
          email_verified_at: p.email_verified_at ?? null,
        })
      })
    }

    const { data: activationStats, error: activationError } = await adminClient
      .from('admin_activation_stats')
      .select('user_id, first_place_at, last_place_at, first_trip_at, last_trip_at, places_count, trips_count')

    if (activationError) console.error('Error fetching activation stats:', activationError)

    const activationMap = new Map<string, {
      first_place_at: string | null
      last_place_at: string | null
      first_trip_at: string | null
      last_trip_at: string | null
      places_count: number
      trips_count: number
    }>()
    if (activationStats) {
      activationStats.forEach((row: any) => {
        activationMap.set(row.user_id, {
          first_place_at: row.first_place_at ?? null,
          last_place_at: row.last_place_at ?? null,
          first_trip_at: row.first_trip_at ?? null,
          last_trip_at: row.last_trip_at ?? null,
          places_count: row.places_count ?? 0,
          trips_count: row.trips_count ?? 0,
        })
      })
    }

    const now = Date.now()
    const sevenDaysAgo = new Date(now - 7 * 24 * 60 * 60 * 1000)

    const usersData = allUsers.map((authUser) => {
      const profile = profileMap.get(authUser.id)
      const emailConfirmedAt = profile?.email_verified_at ?? authUser.email_confirmed_at ?? null
      const act = activationMap.get(authUser.id) ?? {
        first_place_at: null,
        last_place_at: null,
        first_trip_at: null,
        last_trip_at: null,
        places_count: 0,
        trips_count: 0,
      }
      const lastLoginAt = authUser.last_sign_in_at ?? null
      const dates = [lastLoginAt, act.last_place_at, act.last_trip_at].filter(Boolean) as string[]
      const lastActivityAt =
        dates.length
          ? new Date(Math.max(...dates.map((d) => new Date(d).getTime()))).toISOString()
          : null

      return {
        id: authUser.id,
        email: authUser.email,
        email_confirmed_at: emailConfirmedAt,
        created_at: authUser.created_at,
        last_login_at: lastLoginAt,
        first_place_added_at: act.first_place_at,
        first_trip_created_at: act.first_trip_at,
        last_activity_at: lastActivityAt,
        places_count: act.places_count,
        trips_count: act.trips_count,
        welcome_email_sent: profile?.welcome_email_sent ?? false,
        onboarding_nudge_sent: profile?.onboarding_nudge_sent ?? false,
      }
    })

    usersData.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

    const total = usersData.length
    const signedUp = total
    const emailConfirmed = usersData.filter((u) => u.email_confirmed_at != null).length
    const loggedIn = usersData.filter((u) => u.last_login_at !== null).length
    const savedFirstPlace = usersData.filter((u) => u.places_count > 0).length
    const createdFirstTrip = usersData.filter((u) => u.trips_count > 0).length
    const activeLast7Days = usersData.filter((u) => {
      if (!u.last_activity_at) return false
      return new Date(u.last_activity_at) >= sevenDaysAgo
    }).length

    const counts = [signedUp, emailConfirmed, loggedIn, savedFirstPlace, createdFirstTrip, activeLast7Days]
    let biggestDropOffIndex = 0
    let biggestDropOffPct = 0
    for (let i = 0; i < counts.length - 1; i++) {
      const prev = counts[i]
      const next = counts[i + 1]
      if (prev === 0) continue
      const drop = 100 - (next / prev) * 100
      if (drop > biggestDropOffPct) {
        biggestDropOffPct = drop
        biggestDropOffIndex = i
      }
    }

    const funnel: FunnelStage[] = FUNNEL_KEYS.map((key, i) => {
      const count = counts[i]
      const prevCount = i === 0 ? total : counts[i - 1]
      const pctFromPrevious = prevCount === 0 ? null : Math.round((count / prevCount) * 1000) / 10
      const pctOfTotal = total === 0 ? 0 : Math.round((count / total) * 1000) / 10
      return {
        key,
        label: FUNNEL_STAGE_LABELS[key],
        count,
        pctFromPrevious,
        pctOfTotal,
        isBiggestDropOff: i === biggestDropOffIndex && biggestDropOffPct > 0,
      }
    })

    const timeToFirstPlaceMs = usersData
      .filter((u) => u.first_place_added_at && u.created_at)
      .map((u) => new Date(u.first_place_added_at!).getTime() - new Date(u.created_at).getTime())
    const avgTimeToFirstPlaceHours =
      timeToFirstPlaceMs.length > 0
        ? timeToFirstPlaceMs.reduce((a, b) => a + b, 0) / timeToFirstPlaceMs.length / (60 * 60 * 1000)
        : null

    const weekCounts = new Map<string, number>()
    usersData.forEach((u) => {
      const week = getIsoWeekKey(new Date(u.created_at))
      weekCounts.set(week, (weekCounts.get(week) ?? 0) + 1)
    })
    const sortedWeeks = Array.from(weekCounts.entries()).sort((a, b) => a[0].localeCompare(b[0])).slice(-12)
    const weeklySignups = sortedWeeks.map(([week, count]) => ({ week, count }))

    const signedUp7PlusDaysAgo = usersData.filter((u) => new Date(u.created_at) <= sevenDaysAgo).length
    const activeInLast7OfThose =
      signedUp7PlusDaysAgo === 0
        ? 0
        : usersData.filter((u) => {
            if (new Date(u.created_at) > sevenDaysAgo) return false
            return u.last_activity_at && new Date(u.last_activity_at) >= sevenDaysAgo
          }).length
    const returningUserPct =
      signedUp7PlusDaysAgo === 0 ? null : Math.round((activeInLast7OfThose / signedUp7PlusDaysAgo) * 1000) / 10

    const activationRatePct = total === 0 ? 0 : Math.round((savedFirstPlace / total) * 1000) / 10
    const lastWeekCount = sortedWeeks.length >= 2 ? sortedWeeks[sortedWeeks.length - 2][1] : 0
    const thisWeekCount = sortedWeeks.length >= 1 ? sortedWeeks[sortedWeeks.length - 1][1] : 0
    const weeklyGrowthTrend =
      lastWeekCount === 0
        ? 'No prior week'
        : thisWeekCount > lastWeekCount
          ? `Up ${Math.round(((thisWeekCount - lastWeekCount) / lastWeekCount) * 100)}% vs last week`
          : thisWeekCount < lastWeekCount
            ? `Down ${Math.round(((lastWeekCount - thisWeekCount) / lastWeekCount) * 100)}% vs last week`
            : 'Flat vs last week'

    const insights: InsightSummary = {
      activationRatePct,
      activationRateLabel: `% of signups who saved first place`,
      biggestDropOffStage:
        biggestDropOffPct > 0
          ? `${FUNNEL_STAGE_LABELS[FUNNEL_KEYS[biggestDropOffIndex]]} → ${FUNNEL_STAGE_LABELS[FUNNEL_KEYS[biggestDropOffIndex + 1]]}`
          : null,
      biggestDropOffPct: biggestDropOffPct > 0 ? Math.round(biggestDropOffPct * 10) / 10 : null,
      avgTimeToFirstPlaceHours,
      avgTimeToFirstPlaceLabel:
        avgTimeToFirstPlaceHours != null
          ? avgTimeToFirstPlaceHours < 24
            ? `${Math.round(avgTimeToFirstPlaceHours * 10) / 10}h`
            : `${Math.round((avgTimeToFirstPlaceHours / 24) * 10) / 10} days`
          : null,
      weeklyGrowthTrend,
      weeklySignups,
      returningUserPct,
    }

    const metrics = {
      totalUsers: total,
      confirmedUsers: emailConfirmed,
      usersWithLogin: loggedIn,
      usersWithPlaces: savedFirstPlace,
      activeLast7Days,
    }

    return NextResponse.json({
      users: usersData,
      metrics,
      funnel,
      insights,
    })
  } catch (error: any) {
    console.error('Error in admin users API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
