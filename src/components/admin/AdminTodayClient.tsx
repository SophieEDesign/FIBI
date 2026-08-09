'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { getAdminAuthHeaders } from '@/lib/admin-auth-headers'
import type { FunnelStage, InsightSummary, WeeklyCompare } from '@/lib/admin-metrics'
import { PERSON_STATE_LABELS, type PersonLifecycleState } from '@/lib/admin-metrics'

interface OverviewPayload {
  failedSends: number
  blockedSignups: number
  lastRun: {
    started_at: string
    finished_at: string | null
    sent: number
    skipped: number
    failed: number
    status: string
  } | null
  lastFailedRun: {
    started_at: string
    status: string
    failed: number
  } | null
  weekly: WeeklyCompare
  funnel: FunnelStage[]
  insights: InsightSummary
  emailEngagement: {
    open_rate: number | null
    click_rate: number | null
    bounce_rate: number | null
    unsub_rate: number | null
  } | null
  newestPeople: {
    id: string
    email: string | null
    created_at: string
    state: PersonLifecycleState
    places_count: number
  }[]
}

function pct(rate: number | null | undefined): string {
  if (rate == null) return '—'
  return `${(rate * 100).toFixed(1)}%`
}

function deltaLabel(current: number, previous: number): string {
  return `Prev week: ${previous}`
}

function formatShortDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
    })
  } catch {
    return '—'
  }
}

export default function AdminTodayClient() {
  const [data, setData] = useState<OverviewPayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setError(null)
      try {
        const headers = await getAdminAuthHeaders()
        const res = await fetch('/api/admin/overview', { credentials: 'include', headers })
        if (!res.ok) {
          setError(res.status === 403 ? 'Access denied' : "That didn't work. Try again.")
          return
        }
        const json = (await res.json()) as OverviewPayload
        if (!cancelled) setData(json)
      } catch {
        if (!cancelled) setError("That didn't work. Try again.")
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-[#8A857A]">Loading…</div>
    )
  }

  if (error || !data) {
    return (
      <div className="px-4 py-8 sm:px-6 lg:px-8">
        <p className="text-sm text-[#9C3226]">{error || "That didn't work. Try again."}</p>
      </div>
    )
  }

  const quiet =
    data.failedSends === 0 && data.blockedSignups === 0 && !data.lastFailedRun
  const maxFunnel = Math.max(...data.funnel.map((s) => s.count), 1)

  return (
    <div className="px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl space-y-8">
        <div>
          <h1 className="text-2xl font-semibold text-[#17181A]">Today</h1>
          <p className="mt-1 text-sm text-[#5C574C]">Read-only status. Nothing to configure here.</p>
        </div>

        {/* Status line */}
        <section className="rounded-[14px] border border-[#E5E5E5] bg-white p-5 shadow-[0_1px_2px_rgba(26,26,24,0.06),0_8px_24px_rgba(46,70,120,0.08)]">
          {quiet ? (
            <div>
              <p className="text-base font-medium text-[#1E6B48]">Nothing needs you</p>
              {data.lastRun ? (
                <p className="mt-1 text-sm text-[#5C574C]">
                  Last automation run: {data.lastRun.sent} sent, {data.lastRun.skipped} skipped,{' '}
                  {data.lastRun.failed} failed.
                </p>
              ) : (
                <p className="mt-1 text-sm text-[#5C574C]">No automation runs recorded yet.</p>
              )}
            </div>
          ) : (
            <ul className="space-y-2 text-sm">
              {data.failedSends > 0 && (
                <li>
                  <Link href="/app/admin/emails/log" className="text-[#9C3226] hover:underline">
                    {data.failedSends} failed send{data.failedSends === 1 ? '' : 's'} in the last 24
                    hours
                  </Link>
                </li>
              )}
              {data.blockedSignups > 0 && (
                <li>
                  <Link
                    href="/app/admin/signup-attempts"
                    className="text-[#8C6500] hover:underline"
                  >
                    {data.blockedSignups} blocked signup
                    {data.blockedSignups === 1 ? '' : 's'} in the last 24 hours
                  </Link>
                </li>
              )}
              {data.lastFailedRun && (
                <li>
                  <Link
                    href="/app/admin/emails/automations"
                    className="text-[#9C3226] hover:underline"
                  >
                    Latest automation run failed ({data.lastFailedRun.failed} failed sends)
                  </Link>
                </li>
              )}
            </ul>
          )}
        </section>

        {/* Weekly numbers */}
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-[0.12em] text-[#8A857A]">
            This week
          </h2>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {[
              {
                label: 'Signups',
                current: data.weekly.signups.current,
                previous: data.weekly.signups.previous,
              },
              {
                label: 'Activated',
                current: data.weekly.activated.current,
                previous: data.weekly.activated.previous,
                extra:
                  data.weekly.activated.currentRate != null
                    ? `${data.weekly.activated.currentRate}% rate`
                    : null,
              },
              {
                label: 'Places saved',
                current: data.weekly.placesSaved.current,
                previous: data.weekly.placesSaved.previous,
              },
              {
                label: 'Returning users',
                current: data.weekly.returningUsers.current,
                previous: data.weekly.returningUsers.previous,
              },
            ].map((card) => (
              <div
                key={card.label}
                className="rounded-[14px] border border-[#E5E5E5] bg-white p-4 shadow-[0_1px_2px_rgba(26,26,24,0.06),0_8px_24px_rgba(46,70,120,0.08)]"
              >
                <p className="text-xs font-medium text-[#8A857A]">{card.label}</p>
                <p className="mt-2 text-2xl font-semibold text-[#17181A]">{card.current}</p>
                {card.extra ? (
                  <p className="mt-0.5 text-xs text-[#14639B]">{card.extra}</p>
                ) : null}
                <p className="mt-1 text-xs text-[#8A857A]">
                  {deltaLabel(card.current, card.previous)}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Funnel */}
        <section className="rounded-[14px] border border-[#E5E5E5] bg-white p-5 shadow-[0_1px_2px_rgba(26,26,24,0.06),0_8px_24px_rgba(46,70,120,0.08)]">
          <h2 className="text-base font-semibold text-[#17181A]">Activation funnel</h2>
          {data.insights.biggestDropOffStage && (
            <p className="mt-2 text-sm text-[#5C574C]">
              Biggest drop-off is {data.insights.biggestDropOffStage}
              {data.insights.biggestDropOffPct != null
                ? ` (${data.insights.biggestDropOffPct}%).`
                : '.'}
              {data.insights.avgTimeToFirstPlaceLabel
                ? ` Average time to first place: ${data.insights.avgTimeToFirstPlaceLabel}.`
                : ''}
            </p>
          )}
          <div className="mt-4 space-y-3">
            {data.funnel.map((stage) => (
              <div key={stage.key}>
                <div className="mb-1 flex items-baseline justify-between gap-2 text-sm">
                  <span className="text-[#5C574C]">{stage.label}</span>
                  <span className="font-medium text-[#17181A]">
                    {stage.count}
                    {stage.pctFromPrevious != null ? (
                      <span className="ml-2 font-normal text-[#8A857A]">
                        {stage.pctFromPrevious}% from previous
                      </span>
                    ) : null}
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-[#F1EEE6]">
                  <div
                    className={`h-full rounded-full transition-all duration-[280ms] ${
                      stage.isBiggestDropOff ? 'bg-[#8C6500]' : 'bg-[#2E9EE8]'
                    }`}
                    style={{ width: `${Math.max(4, (stage.count / maxFunnel) * 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Email */}
          <section className="rounded-[14px] border border-[#E5E5E5] bg-white p-5 shadow-[0_1px_2px_rgba(26,26,24,0.06),0_8px_24px_rgba(46,70,120,0.08)]">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-base font-semibold text-[#17181A]">Email, last 30 days</h2>
              <Link href="/app/admin/emails/log" className="text-sm text-[#14639B] hover:underline">
                Log
              </Link>
            </div>
            <dl className="grid grid-cols-2 gap-3 text-sm">
              {[
                ['Open rate', pct(data.emailEngagement?.open_rate)],
                ['Click rate', pct(data.emailEngagement?.click_rate)],
                ['Bounce rate', pct(data.emailEngagement?.bounce_rate)],
                ['Unsub rate', pct(data.emailEngagement?.unsub_rate)],
              ].map(([label, value]) => (
                <div key={label} className="rounded-xl bg-[#F5F2EC] px-3 py-2">
                  <dt className="text-xs text-[#8A857A]">{label}</dt>
                  <dd className="mt-0.5 font-medium text-[#17181A]">{value}</dd>
                </div>
              ))}
            </dl>
          </section>

          {/* Newest people */}
          <section className="rounded-[14px] border border-[#E5E5E5] bg-white p-5 shadow-[0_1px_2px_rgba(26,26,24,0.06),0_8px_24px_rgba(46,70,120,0.08)]">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-base font-semibold text-[#17181A]">Newest people</h2>
              <Link href="/app/admin/people" className="text-sm text-[#14639B] hover:underline">
                All people
              </Link>
            </div>
            <ul className="divide-y divide-[#E5E5E5]">
              {data.newestPeople.length === 0 ? (
                <li className="py-2 text-sm text-[#8A857A]">No signups yet.</li>
              ) : (
                data.newestPeople.map((person) => (
                  <li key={person.id}>
                    <Link
                      href={`/app/admin/people/${person.id}`}
                      className="flex items-center justify-between gap-3 py-2.5 transition-colors duration-[130ms] hover:bg-[#FAF8F3]"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-[#17181A]">
                          {person.email || 'No email'}
                        </p>
                        <p className="text-xs text-[#8A857A]">
                          {PERSON_STATE_LABELS[person.state]} · {formatShortDate(person.created_at)}
                        </p>
                      </div>
                      <span className="shrink-0 text-xs text-[#8A857A]">
                        {person.places_count} places
                      </span>
                    </Link>
                  </li>
                ))
              )}
            </ul>
          </section>
        </div>
      </div>
    </div>
  )
}
