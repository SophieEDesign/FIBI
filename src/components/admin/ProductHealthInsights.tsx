'use client'

import type { InsightSummary } from '@/lib/admin-metrics'

interface ProductHealthInsightsProps {
  insights: InsightSummary | null
}

export default function ProductHealthInsights({ insights }: ProductHealthInsightsProps) {
  if (!insights) return null

  return (
    <div className="mb-8">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Product health insights</h2>
      <div className="rounded-lg border border-gray-200 bg-white shadow-sm p-6">
        <ul className="space-y-3 text-sm">
          <li className="flex flex-wrap items-baseline gap-2">
            <span className="text-gray-500">Activation rate:</span>
            <span className="font-medium text-gray-900">{insights.activationRatePct}%</span>
            <span className="text-gray-400">{insights.activationRateLabel}</span>
          </li>
          {insights.biggestDropOffStage != null && insights.biggestDropOffPct != null && (
            <li className="flex flex-wrap items-baseline gap-2">
              <span className="text-gray-500">Biggest drop-off:</span>
              <span className="font-medium text-gray-900">{insights.biggestDropOffStage}</span>
              <span className="text-amber-600">({insights.biggestDropOffPct}%)</span>
            </li>
          )}
          {insights.avgTimeToFirstPlaceLabel != null && (
            <li className="flex flex-wrap items-baseline gap-2">
              <span className="text-gray-500">Avg time to first place:</span>
              <span className="font-medium text-gray-900">{insights.avgTimeToFirstPlaceLabel}</span>
            </li>
          )}
          <li className="flex flex-wrap items-baseline gap-2">
            <span className="text-gray-500">Weekly growth:</span>
            <span className="font-medium text-gray-900">{insights.weeklyGrowthTrend}</span>
          </li>
          {insights.returningUserPct != null && (
            <li className="flex flex-wrap items-baseline gap-2">
              <span className="text-gray-500">Returning users (7d):</span>
              <span className="font-medium text-gray-900">{insights.returningUserPct}%</span>
              <span className="text-gray-400">of signups 7+ days ago active in last 7 days</span>
            </li>
          )}
        </ul>
        {insights.weeklySignups?.length > 0 && (
          <p className="mt-3 text-xs text-gray-400">
            Last {insights.weeklySignups.length} weeks: {insights.weeklySignups.map((w) => `${w.week}: ${w.count}`).join(', ')}
          </p>
        )}
      </div>
    </div>
  )
}
