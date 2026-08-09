/**
 * Shared types and pure builders for admin dashboard metrics.
 */

export type FunnelStageKey =
  | 'signed_up'
  | 'email_confirmed'
  | 'logged_in'
  | 'saved_first_place'
  | 'created_first_trip'
  | 'active_last_7_days'

export type PersonLifecycleState =
  | 'awaiting_confirmation'
  | 'confirmed_no_save'
  | 'activated'
  | 'dormant'

export interface FunnelStage {
  key: FunnelStageKey
  label: string
  count: number
  pctFromPrevious: number | null
  pctOfTotal: number
  isBiggestDropOff?: boolean
}

export interface InsightSummary {
  activationRatePct: number
  activationRateLabel: string
  biggestDropOffStage: string | null
  biggestDropOffPct: number | null
  avgTimeToFirstPlaceHours: number | null
  avgTimeToFirstPlaceLabel: string | null
  weeklyGrowthTrend: string
  weeklySignups: { week: string; count: number }[]
  returningUserPct: number | null
}

export interface AutomationRunStatus {
  status: 'idle' | 'running' | 'success' | 'failure'
  lastRun: {
    started_at: string
    finished_at: string | null
    sent: number
    skipped: number
    failed: number
    status: 'running' | 'success' | 'failure'
    errors: string[]
  } | null
}

export interface WeeklyMetric {
  current: number
  previous: number
  /** Optional rate (0–100) for activation */
  currentRate?: number | null
  previousRate?: number | null
}

export interface WeeklyCompare {
  signups: WeeklyMetric
  activated: WeeklyMetric
  placesSaved: WeeklyMetric
  returningUsers: WeeklyMetric
}

export interface AdminPersonRow {
  id: string
  email: string | null
  email_confirmed_at: string | null
  created_at: string
  last_login_at: string | null
  first_place_added_at: string | null
  first_trip_created_at?: string | null
  last_activity_at?: string | null
  places_count: number
  trips_count?: number
  welcome_email_sent: boolean
  onboarding_nudge_sent: boolean
  state: PersonLifecycleState
}

export const FUNNEL_STAGE_LABELS: Record<FunnelStageKey, string> = {
  signed_up: 'Signed up',
  email_confirmed: 'Email confirmed',
  logged_in: 'Logged in',
  saved_first_place: 'Saved first place',
  created_first_trip: 'Created first trip',
  active_last_7_days: 'Active last 7 days',
}

export const PERSON_STATE_LABELS: Record<PersonLifecycleState, string> = {
  awaiting_confirmation: 'Awaiting confirmation',
  confirmed_no_save: 'Confirmed, no save',
  activated: 'Activated',
  dormant: 'Dormant',
}

export const FUNNEL_KEYS: FunnelStageKey[] = [
  'signed_up',
  'email_confirmed',
  'logged_in',
  'saved_first_place',
  'created_first_trip',
  'active_last_7_days',
]

export function getIsoWeekKey(date: Date): string {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() + 4 - (d.getDay() || 7))
  const yearStart = new Date(d.getFullYear(), 0, 1)
  const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
  return `${d.getFullYear()}-W${String(weekNo).padStart(2, '0')}`
}

export function derivePersonState(input: {
  email_confirmed_at: string | null
  places_count: number
  last_login_at: string | null
  now?: number
}): PersonLifecycleState {
  const now = input.now ?? Date.now()
  if (!input.email_confirmed_at) return 'awaiting_confirmation'
  if ((input.places_count ?? 0) === 0) return 'confirmed_no_save'
  if (
    !input.last_login_at ||
    new Date(input.last_login_at).getTime() < now - 30 * 24 * 60 * 60 * 1000
  ) {
    return 'dormant'
  }
  return 'activated'
}

export function formatAvgTimeToFirstPlace(hours: number | null): string | null {
  if (hours == null) return null
  if (hours < 24) return `${Math.round(hours * 10) / 10}h`
  return `${Math.round((hours / 24) * 10) / 10} days`
}

type MetricUser = {
  created_at: string
  email_confirmed_at: string | null
  last_login_at: string | null
  first_place_added_at: string | null
  places_count: number
  trips_count: number
  last_activity_at: string | null
}

export function buildFunnelAndInsights(usersData: MetricUser[]): {
  funnel: FunnelStage[]
  insights: InsightSummary
  metrics: {
    totalUsers: number
    confirmedUsers: number
    usersWithLogin: number
    usersWithPlaces: number
    activeLast7Days: number
  }
} {
  const now = Date.now()
  const sevenDaysAgo = new Date(now - 7 * 24 * 60 * 60 * 1000)
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

  const counts = [
    signedUp,
    emailConfirmed,
    loggedIn,
    savedFirstPlace,
    createdFirstTrip,
    activeLast7Days,
  ]
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
  const sortedWeeks = Array.from(weekCounts.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .slice(-12)
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
    signedUp7PlusDaysAgo === 0
      ? null
      : Math.round((activeInLast7OfThose / signedUp7PlusDaysAgo) * 1000) / 10

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
    activationRateLabel: '% of signups who saved first place',
    biggestDropOffStage:
      biggestDropOffPct > 0
        ? `${FUNNEL_STAGE_LABELS[FUNNEL_KEYS[biggestDropOffIndex]]} → ${FUNNEL_STAGE_LABELS[FUNNEL_KEYS[biggestDropOffIndex + 1]]}`
        : null,
    biggestDropOffPct: biggestDropOffPct > 0 ? Math.round(biggestDropOffPct * 10) / 10 : null,
    avgTimeToFirstPlaceHours,
    avgTimeToFirstPlaceLabel: formatAvgTimeToFirstPlace(avgTimeToFirstPlaceHours),
    weeklyGrowthTrend,
    weeklySignups,
    returningUserPct,
  }

  return {
    funnel,
    insights,
    metrics: {
      totalUsers: total,
      confirmedUsers: emailConfirmed,
      usersWithLogin: loggedIn,
      usersWithPlaces: savedFirstPlace,
      activeLast7Days,
    },
  }
}

/** Prior-period comparison for the last 7 days vs the previous 7 days. */
export function buildWeeklyCompare(
  usersData: MetricUser[],
  placesCreatedInWindow?: { current: number; previous: number }
): WeeklyCompare {
  const now = Date.now()
  const day = 24 * 60 * 60 * 1000
  const currentStart = now - 7 * day
  const previousStart = now - 14 * day

  const inRange = (iso: string, start: number, end: number) => {
    const t = new Date(iso).getTime()
    return t >= start && t < end
  }

  const signupsCurrent = usersData.filter((u) => inRange(u.created_at, currentStart, now)).length
  const signupsPrevious = usersData.filter((u) =>
    inRange(u.created_at, previousStart, currentStart)
  ).length

  const activatedCurrent = usersData.filter(
    (u) =>
      u.first_place_added_at &&
      inRange(u.first_place_added_at, currentStart, now)
  ).length
  const activatedPrevious = usersData.filter(
    (u) =>
      u.first_place_added_at &&
      inRange(u.first_place_added_at, previousStart, currentStart)
  ).length

  const cohortCurrent = usersData.filter((u) => inRange(u.created_at, currentStart, now))
  const cohortPrevious = usersData.filter((u) => inRange(u.created_at, previousStart, currentStart))
  const activatedRateCurrent =
    cohortCurrent.length === 0
      ? null
      : Math.round(
          (cohortCurrent.filter((u) => u.places_count > 0).length / cohortCurrent.length) * 1000
        ) / 10
  const activatedRatePrevious =
    cohortPrevious.length === 0
      ? null
      : Math.round(
          (cohortPrevious.filter((u) => u.places_count > 0).length / cohortPrevious.length) * 1000
        ) / 10

  // Returning: users who signed up before the window and were active in it
  const returningCurrent = usersData.filter((u) => {
    if (new Date(u.created_at).getTime() >= currentStart) return false
    return u.last_activity_at && inRange(u.last_activity_at, currentStart, now)
  }).length
  const returningPrevious = usersData.filter((u) => {
    if (new Date(u.created_at).getTime() >= previousStart) return false
    return u.last_activity_at && inRange(u.last_activity_at, previousStart, currentStart)
  }).length

  return {
    signups: { current: signupsCurrent, previous: signupsPrevious },
    activated: {
      current: activatedCurrent,
      previous: activatedPrevious,
      currentRate: activatedRateCurrent,
      previousRate: activatedRatePrevious,
    },
    placesSaved: {
      current: placesCreatedInWindow?.current ?? 0,
      previous: placesCreatedInWindow?.previous ?? 0,
    },
    returningUsers: { current: returningCurrent, previous: returningPrevious },
  }
}
