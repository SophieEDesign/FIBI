'use client'

import type { FunnelStage } from '@/lib/admin-metrics'

function pctColor(pct: number | null): string {
  if (pct === null) return 'text-gray-500'
  if (pct >= 30) return 'text-emerald-700'
  if (pct >= 10) return 'text-amber-600'
  return 'text-red-600'
}

function cardBorder(isBiggestDropOff: boolean, pct: number | null): string {
  if (isBiggestDropOff && pct !== null && pct < 10) return 'border-red-200 bg-red-50'
  if (isBiggestDropOff) return 'border-amber-200 bg-amber-50'
  return 'border-gray-200 bg-white'
}

interface AdminFunnelProps {
  funnel: FunnelStage[]
}

export default function AdminFunnel({ funnel }: AdminFunnelProps) {
  if (!funnel?.length) return null

  return (
    <div className="mb-8">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Activation funnel</h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-6">
        {funnel.map((stage) => {
          const pct = stage.pctFromPrevious
          const borderBg = cardBorder(!!stage.isBiggestDropOff, pct ?? 0)
          return (
            <div
              key={stage.key}
              className={`rounded-lg border shadow-sm p-4 ${borderBg}`}
            >
              <div className="text-sm font-medium text-gray-500 truncate" title={stage.label}>
                {stage.label}
              </div>
              <div className="mt-2 text-2xl font-semibold text-gray-900">
                {stage.count}
              </div>
              <div className="mt-1 text-sm text-gray-500">
                {pct !== null ? (
                  <span className={pctColor(pct)}>
                    {pct}% from previous
                  </span>
                ) : (
                  <span className="text-gray-400">—</span>
                )}
              </div>
              <div className="mt-0.5 text-xs text-gray-400">
                {stage.pctOfTotal}% of total
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
