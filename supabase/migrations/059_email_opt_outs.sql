-- Durable marketing opt-outs by email (PECR/GDPR).
-- Survives missing profiles and is checked before every marketing send.

CREATE TABLE IF NOT EXISTS public.email_opt_outs (
  email text PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  opted_out_at timestamptz NOT NULL DEFAULT now(),
  source text NOT NULL DEFAULT 'unsubscribe'
    CHECK (source IN ('unsubscribe', 'preferences', 'complaint', 'bounce', 'admin')),
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.email_opt_outs IS
  'Marketing suppression list keyed by normalised email. Required for PECR/GDPR soft opt-out records.';

CREATE INDEX IF NOT EXISTS idx_email_opt_outs_user_id ON public.email_opt_outs(user_id);
CREATE INDEX IF NOT EXISTS idx_email_opt_outs_opted_out_at ON public.email_opt_outs(opted_out_at);

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS marketing_opted_out_at timestamptz;

COMMENT ON COLUMN public.profiles.marketing_opted_out_at IS
  'When the user last opted out of marketing email. Cleared on explicit re-consent.';

ALTER TABLE public.email_opt_outs ENABLE ROW LEVEL SECURITY;

-- No public policies: only service role (admin client) reads/writes this table.

-- Backfill from existing profile opt-outs where we can resolve an email.
INSERT INTO public.email_opt_outs (email, user_id, opted_out_at, source)
SELECT lower(trim(u.email)), p.id, coalesce(p.updated_at, now()), 'unsubscribe'
FROM public.profiles p
JOIN auth.users u ON u.id = p.id
WHERE p.marketing_opt_in = false
  AND u.email IS NOT NULL
  AND length(trim(u.email)) > 0
ON CONFLICT (email) DO NOTHING;
