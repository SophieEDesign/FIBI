/**
 * Shared types for admin dashboard: funnel, insights, automation status.
 * Used by API responses and dashboard components; chart/cohort features can consume the same types later.
 */

export type FunnelStageKey =
  | 'signed_up'
  | 'email_confirmed'
  | 'logged_in'
  | 'saved_first_place'
  | 'created_first_trip'
  | 'active_last_7_days'

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

export const FUNNEL_STAGE_LABELS: Record<FunnelStageKey, string> = {
  signed_up: 'Signed Up',
  email_confirmed: 'Email Confirmed',
  logged_in: 'Logged In',
  saved_first_place: 'Saved First Place',
  created_first_trip: 'Created First Trip',
  active_last_7_days: 'Active Last 7 Days',
}
