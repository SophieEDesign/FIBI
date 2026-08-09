-- Store provider failure reason on email_logs for overnight debugging.

ALTER TABLE public.email_logs
  ADD COLUMN IF NOT EXISTS error_detail text;

COMMENT ON COLUMN public.email_logs.error_detail IS 'Resend or send-path failure message when status = failed.';
