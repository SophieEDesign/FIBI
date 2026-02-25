-- GDPR: marketing / product updates opt-in. Only send non-transactional emails if user opted in.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS marketing_opt_in BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.profiles.marketing_opt_in IS 'User has consented to receive product updates and marketing emails (e.g. tips, onboarding nudges).';
