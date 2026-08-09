-- Mailchimp-style campaign setup fields (subject, from, preview text).

ALTER TABLE public.email_campaigns
  ADD COLUMN IF NOT EXISTS subject text,
  ADD COLUMN IF NOT EXISTS preview_text text,
  ADD COLUMN IF NOT EXISTS from_name text,
  ADD COLUMN IF NOT EXISTS from_email text;

COMMENT ON COLUMN public.email_campaigns.subject IS 'Campaign subject line; falls back to template subject when null.';
COMMENT ON COLUMN public.email_campaigns.preview_text IS 'Inbox preview text (preheader).';
COMMENT ON COLUMN public.email_campaigns.from_name IS 'From display name; default FiBi.';
COMMENT ON COLUMN public.email_campaigns.from_email IS 'From address; default hello@fibi.world.';
