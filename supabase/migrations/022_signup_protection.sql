-- Signup protection: log blocked attempts and track rate limits per IP.
-- RLS: only service_role (used by API) can access; anon/authenticated have no policies.

-- Blocked signup attempts only (for auditing).
CREATE TABLE IF NOT EXISTS public.signup_attempt_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  ip_address text,
  user_agent text,
  blocked_reason text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Rate limiting: one row per attempt (any outcome). Count per IP in last hour.
CREATE TABLE IF NOT EXISTS public.signup_rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_signup_rate_limits_ip_created
  ON public.signup_rate_limits (ip_address, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_signup_attempt_logs_created
  ON public.signup_attempt_logs (created_at DESC);

ALTER TABLE public.signup_attempt_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.signup_rate_limits ENABLE ROW LEVEL SECURITY;

-- No SELECT/INSERT/UPDATE/DELETE policies for anon or authenticated;
-- service_role bypasses RLS, so the signup API (using service role) can read/write.
COMMENT ON TABLE public.signup_attempt_logs IS 'Blocked signup attempts only; used for auditing and abuse review.';
COMMENT ON TABLE public.signup_rate_limits IS 'All signup attempts per IP for rate limiting (e.g. 5 per hour).';
