'use client'

const GUARDRAILS = '48h between emails • Max 3 lifecycle emails per user • Same template never sent twice • Max 200 per run.'

function formatRunTime(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })
}

interface LastRun {
  started_at: string
  finished_at: string | null
  sent: number
  skipped: number
  failed: number
  status: 'running' | 'success' | 'failure'
  errors: string[]
}

interface EmailAutomationPanelProps {
  isRunning: boolean
  lastRun: LastRun | null
  runResult: { sent: number; skipped: number; failed: number; limitReached?: boolean; errors?: string[] } | null
  onRun: () => void
}

export default function EmailAutomationPanel({
  isRunning,
  lastRun,
  runResult,
  onRun,
}: EmailAutomationPanelProps) {
  const status: 'idle' | 'running' | 'success' | 'failure' = isRunning
    ? 'running'
    : runResult != null
      ? runResult.failed > 0
        ? 'failure'
        : 'success'
      : lastRun != null
        ? lastRun.status === 'running'
          ? 'running'
          : lastRun.status === 'failure'
            ? 'failure'
            : 'success'
        : 'idle'

  const badgeClass =
    status === 'running'
      ? 'bg-amber-100 text-amber-800'
      : status === 'success'
        ? 'bg-emerald-100 text-emerald-800'
        : status === 'failure'
          ? 'bg-red-100 text-red-800'
          : 'bg-gray-100 text-gray-700'

  const badgeLabel =
    status === 'running'
      ? 'Running'
      : status === 'success'
        ? 'Last run successful'
        : status === 'failure'
          ? 'Failed'
          : 'Idle'

  const displayRun = runResult != null ? { sent: runResult.sent, skipped: runResult.skipped, failed: runResult.failed, started_at: new Date().toISOString(), finished_at: null, status: status as 'running' | 'success' | 'failure', errors: runResult.errors ?? [] } : lastRun

  return (
    <div className="mb-8 rounded-lg border border-gray-200 bg-white shadow-sm p-6">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-2">
        <h2 className="text-lg font-semibold text-gray-900">Email automation</h2>
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${badgeClass}`}>
          {badgeLabel}
        </span>
      </div>
      <p className="text-sm text-gray-600 mb-4">
        Manually trigger the email automation runner. Sends are rate-limited; rules below.
      </p>
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <button
          type="button"
          onClick={onRun}
          disabled={isRunning}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-gray-800 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50 disabled:pointer-events-none"
        >
          {isRunning ? 'Running…' : 'Run email automations now'}
        </button>
        <span className="text-sm text-gray-400">Queued: Not applicable — sends on run</span>
      </div>
      {displayRun != null && (
        <div className="mb-4 p-4 rounded-lg border border-gray-200 bg-gray-50">
          <p className="text-sm text-gray-600">
            {runResult != null ? 'Last run (this session):' : 'Last run:'}{' '}
            {runResult != null ? 'Just now' : formatRunTime(displayRun.started_at)}
            {displayRun.finished_at != null && ` — finished ${formatRunTime(displayRun.finished_at)}`}
          </p>
          <p className="text-sm text-gray-800 mt-1">
            Sent: <strong>{displayRun.sent}</strong>, Skipped: <strong>{displayRun.skipped}</strong>, Failed: <strong>{displayRun.failed}</strong>
          </p>
          {displayRun.errors?.length > 0 && (
            <ul className="mt-2 text-sm text-red-700 list-disc list-inside">
              {displayRun.errors.slice(0, 10).map((e, i) => (
                <li key={i}>{e}</li>
              ))}
              {displayRun.errors.length > 10 && (
                <li>… and {displayRun.errors.length - 10} more</li>
              )}
            </ul>
          )}
        </div>
      )}
      <p className="text-xs text-gray-500">
        Open rate: — (tracking not enabled)
      </p>
      <p className="mt-2 text-xs text-gray-500">
        {GUARDRAILS}
      </p>
    </div>
  )
}
