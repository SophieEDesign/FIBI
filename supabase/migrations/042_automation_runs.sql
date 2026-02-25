-- Automation run history for admin dashboard (last run timestamp, status, counts).
-- Written by run-automations API and cron; read by automation-status API. service_role only.

CREATE TABLE IF NOT EXISTS public.automation_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  sent int NOT NULL DEFAULT 0,
  skipped int NOT NULL DEFAULT 0,
  failed int NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'success', 'failure')),
  errors jsonb DEFAULT '[]'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_automation_runs_started_at ON public.automation_runs(started_at DESC);

ALTER TABLE public.automation_runs ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.automation_runs IS 'History of email automation runs for admin dashboard.';

REVOKE ALL ON public.automation_runs FROM anon;
REVOKE ALL ON public.automation_runs FROM authenticated;
GRANT SELECT, INSERT, UPDATE ON public.automation_runs TO service_role;
