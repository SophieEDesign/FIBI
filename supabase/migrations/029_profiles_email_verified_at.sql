-- Add email_verified_at to profiles: set when user clicks "confirm email" link
-- Used for: in-app banner, eligibility for welcome/nudge/founding emails
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMPTZ;
