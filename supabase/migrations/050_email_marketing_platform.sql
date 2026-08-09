-- Email marketing platform: tracking columns, segments, campaigns.

-- ---------------------------------------------------------------------------
-- email_logs: delivery / engagement timestamps + campaign link
-- ---------------------------------------------------------------------------
ALTER TABLE public.email_logs
  ADD COLUMN IF NOT EXISTS opened_at timestamptz,
  ADD COLUMN IF NOT EXISTS bounced_at timestamptz,
  ADD COLUMN IF NOT EXISTS complained_at timestamptz,
  ADD COLUMN IF NOT EXISTS delivered_at timestamptz,
  ADD COLUMN IF NOT EXISTS unsubscribed_at timestamptz,
  ADD COLUMN IF NOT EXISTS campaign_id uuid;

COMMENT ON COLUMN public.email_logs.opened_at IS 'First open from Resend email.opened webhook.';
COMMENT ON COLUMN public.email_logs.bounced_at IS 'Bounce time from Resend email.bounced webhook.';
COMMENT ON COLUMN public.email_logs.complained_at IS 'Complaint time from Resend email.complained webhook.';
COMMENT ON COLUMN public.email_logs.delivered_at IS 'Delivery time from Resend email.delivered webhook.';
COMMENT ON COLUMN public.email_logs.unsubscribed_at IS 'When recipient unsubscribed via link/prefs after this send.';

-- ---------------------------------------------------------------------------
-- Named audience segments (same condition shape as email_automations.conditions)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.email_segments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  conditions jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_email_segments_name ON public.email_segments(name);

CREATE OR REPLACE FUNCTION public.update_email_segments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_email_segments_updated_at ON public.email_segments;
CREATE TRIGGER trigger_email_segments_updated_at
  BEFORE UPDATE ON public.email_segments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_email_segments_updated_at();

ALTER TABLE public.email_segments ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.email_segments FROM anon;
REVOKE ALL ON public.email_segments FROM authenticated;
GRANT ALL ON public.email_segments TO service_role;

COMMENT ON TABLE public.email_segments IS 'Named audience segments for campaigns; conditions match AutomationConditions.';

-- ---------------------------------------------------------------------------
-- Scheduled / one-off campaigns
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.email_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  template_slug text NOT NULL REFERENCES public.email_templates(slug) ON DELETE RESTRICT,
  segment_id uuid REFERENCES public.email_segments(id) ON DELETE SET NULL,
  filters jsonb,
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'scheduled', 'sending', 'sent', 'cancelled', 'failed')),
  scheduled_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  audience_count integer NOT NULL DEFAULT 0,
  sent_count integer NOT NULL DEFAULT 0,
  failed_count integer NOT NULL DEFAULT 0,
  opened_count integer NOT NULL DEFAULT 0,
  clicked_count integer NOT NULL DEFAULT 0,
  bounced_count integer NOT NULL DEFAULT 0,
  unsubscribed_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_email_campaigns_status_scheduled
  ON public.email_campaigns(status, scheduled_at)
  WHERE status = 'scheduled';
CREATE INDEX IF NOT EXISTS idx_email_campaigns_template ON public.email_campaigns(template_slug);
CREATE INDEX IF NOT EXISTS idx_email_campaigns_segment ON public.email_campaigns(segment_id);

CREATE OR REPLACE FUNCTION public.update_email_campaigns_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_email_campaigns_updated_at ON public.email_campaigns;
CREATE TRIGGER trigger_email_campaigns_updated_at
  BEFORE UPDATE ON public.email_campaigns
  FOR EACH ROW
  EXECUTE FUNCTION public.update_email_campaigns_updated_at();

ALTER TABLE public.email_campaigns ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.email_campaigns FROM anon;
REVOKE ALL ON public.email_campaigns FROM authenticated;
GRANT ALL ON public.email_campaigns TO service_role;

COMMENT ON TABLE public.email_campaigns IS 'Marketing campaigns: compose, audience, schedule, send, analytics.';

-- Link email_logs.campaign_id now that campaigns exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'email_logs_campaign_id_fkey'
  ) THEN
    ALTER TABLE public.email_logs
      ADD CONSTRAINT email_logs_campaign_id_fkey
      FOREIGN KEY (campaign_id) REFERENCES public.email_campaigns(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_email_logs_campaign_id ON public.email_logs(campaign_id)
  WHERE campaign_id IS NOT NULL;
