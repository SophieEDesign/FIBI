-- Email log: store recipient email for "who was sent" and Resend id for click webhooks.
-- Click tracking: store link clicks from Resend webhook (email.clicked).

-- Add columns to email_logs (nullable for existing rows)
ALTER TABLE public.email_logs
  ADD COLUMN IF NOT EXISTS recipient_email text,
  ADD COLUMN IF NOT EXISTS resend_email_id text;

CREATE INDEX IF NOT EXISTS idx_email_logs_resend_email_id ON public.email_logs(resend_email_id) WHERE resend_email_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_email_logs_sent_at ON public.email_logs(sent_at DESC);

COMMENT ON COLUMN public.email_logs.recipient_email IS 'Recipient email at send time for display in admin log.';
COMMENT ON COLUMN public.email_logs.resend_email_id IS 'Resend email id for correlating click webhooks.';

-- Table for link clicks (from Resend email.clicked webhook)
CREATE TABLE IF NOT EXISTS public.email_link_clicks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email_log_id uuid NOT NULL REFERENCES public.email_logs(id) ON DELETE CASCADE,
  link_url text NOT NULL,
  clicked_at timestamptz NOT NULL DEFAULT now(),
  ip_address text,
  user_agent text
);

CREATE INDEX IF NOT EXISTS idx_email_link_clicks_email_log ON public.email_link_clicks(email_log_id);
CREATE INDEX IF NOT EXISTS idx_email_link_clicks_clicked_at ON public.email_link_clicks(clicked_at DESC);

ALTER TABLE public.email_link_clicks ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.email_link_clicks FROM anon;
REVOKE ALL ON public.email_link_clicks FROM authenticated;
GRANT SELECT, INSERT ON public.email_link_clicks TO service_role;

COMMENT ON TABLE public.email_link_clicks IS 'Link clicks from Resend email.clicked webhook; joined to email_logs for admin reporting.';
