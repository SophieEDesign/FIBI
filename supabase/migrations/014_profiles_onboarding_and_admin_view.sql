-- Add onboarding email flags to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS welcome_email_sent BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS onboarding_nudge_sent BOOLEAN NOT NULL DEFAULT false;

-- Admin user overview: one row per user for eligibility checks (service-role only in API)
CREATE OR REPLACE VIEW public.admin_user_overview AS
SELECT
  u.id,
  u.email,
  u.email_confirmed_at,
  u.created_at,
  COALESCE(p.welcome_email_sent, false) AS welcome_email_sent,
  COALESCE(p.onboarding_nudge_sent, false) AS onboarding_nudge_sent,
  COALESCE(places.cnt, 0)::int AS places_count
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
LEFT JOIN (
  SELECT user_id, COUNT(*)::int AS cnt
  FROM public.saved_items
  GROUP BY user_id
) places ON places.user_id = u.id;
