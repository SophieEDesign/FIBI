-- Run in the PRODUCTION Supabase project (yjvztlidisxkxkarjfce)
-- SQL Editor: https://supabase.com/dashboard/project/yjvztlidisxkxkarjfce/sql/new
-- Safe to re-run (IF NOT EXISTS / ON CONFLICT / NOT EXISTS).
--
-- 1) Ensures campaigns/segments tables exist (from email marketing platform)
-- 2) Seeds "We've updated FIBI" template + draft campaign
-- Does NOT send — review/send from Admin → Emails → Campaigns

-- ========== Schema (no-op if already applied) ==========

ALTER TABLE public.email_logs
  ADD COLUMN IF NOT EXISTS opened_at timestamptz,
  ADD COLUMN IF NOT EXISTS bounced_at timestamptz,
  ADD COLUMN IF NOT EXISTS complained_at timestamptz,
  ADD COLUMN IF NOT EXISTS delivered_at timestamptz,
  ADD COLUMN IF NOT EXISTS unsubscribed_at timestamptz,
  ADD COLUMN IF NOT EXISTS campaign_id uuid;

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
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS trigger_email_segments_updated_at ON public.email_segments;
CREATE TRIGGER trigger_email_segments_updated_at
  BEFORE UPDATE ON public.email_segments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_email_segments_updated_at();

ALTER TABLE public.email_segments ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.email_segments FROM anon;
REVOKE ALL ON public.email_segments FROM authenticated;
GRANT ALL ON public.email_segments TO service_role;

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
  updated_at timestamptz NOT NULL DEFAULT now(),
  subject text,
  preview_text text,
  from_name text,
  from_email text
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
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS trigger_email_campaigns_updated_at ON public.email_campaigns;
CREATE TRIGGER trigger_email_campaigns_updated_at
  BEFORE UPDATE ON public.email_campaigns
  FOR EACH ROW
  EXECUTE FUNCTION public.update_email_campaigns_updated_at();

ALTER TABLE public.email_campaigns ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.email_campaigns FROM anon;
REVOKE ALL ON public.email_campaigns FROM authenticated;
GRANT ALL ON public.email_campaigns TO service_role;

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

ALTER TABLE public.email_campaigns
  ADD COLUMN IF NOT EXISTS subject text,
  ADD COLUMN IF NOT EXISTS preview_text text,
  ADD COLUMN IF NOT EXISTS from_name text,
  ADD COLUMN IF NOT EXISTS from_email text;

-- ========== Template + draft campaign ==========

INSERT INTO public.email_templates (name, slug, subject, html_content, is_active)
VALUES (
  'System Update — August 2026',
  'system-update-aug-2026',
  'We''ve updated FIBI',
  $html$
<h2 style="margin:0 0 16px;font-size:24px;font-weight:600;color:#171717;">We've updated FIBI</h2>
<p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#374151;">
  A few quiet improvements to help you save places, organise trips, and share them when you're ready.
</p>

<p style="margin:24px 0 8px;font-size:16px;font-weight:600;color:#171717;">Share a Travel Board</p>
<p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#374151;">
  Open a trip and tap <strong>Share board</strong>. You get a calm public link anyone can open — no account needed to look.
</p>

<p style="margin:24px 0 8px;font-size:16px;font-weight:600;color:#171717;">Travel Guides</p>
<p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#374151;">
  Curated lists you can save straight into your own board. Start with
  <a href="https://fibi.world/travel-guides/north-wales-hidden-gems" style="color:#2563eb;text-decoration:underline;">8 hidden gems in North Wales</a>,
  or browse more on
  <a href="https://fibi.world/travel-guides" style="color:#2563eb;text-decoration:underline;">Travel Guides</a>.
</p>

<p style="margin:24px 0 8px;font-size:16px;font-weight:600;color:#171717;">Continue with Google</p>
<p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#374151;">
  Sign in a little faster when you next open FIBI — Google is there alongside email.
</p>

<p style="margin:28px 0 0;text-align:center;">
  <a href="https://fibi.world/login" style="display:inline-block;padding:14px 28px;background:#2563eb;color:#ffffff;text-decoration:none;border-radius:8px;font-weight:600;font-size:16px;">Open FIBI</a>
</p>
<p style="margin:24px 0 0;font-size:14px;color:#6b7280;">
  As always, reply if something feels off — we read every message.
</p>
$html$,
  true
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  subject = EXCLUDED.subject,
  html_content = EXCLUDED.html_content,
  is_active = EXCLUDED.is_active,
  updated_at = now();

INSERT INTO public.email_campaigns (
  name,
  template_slug,
  filters,
  status,
  subject,
  preview_text,
  from_name,
  from_email
)
SELECT
  'We''ve updated FIBI — August 2026',
  'system-update-aug-2026',
  '{"confirmed": true}'::jsonb,
  'draft',
  'We''ve updated FIBI',
  'Travel Boards you can share, Travel Guides, and Continue with Google.',
  'FiBi',
  'hello@fibi.world'
WHERE NOT EXISTS (
  SELECT 1
  FROM public.email_campaigns
  WHERE template_slug = 'system-update-aug-2026'
    AND name = 'We''ve updated FIBI — August 2026'
);

SELECT slug, name, subject, is_active
FROM public.email_templates
WHERE slug = 'system-update-aug-2026';

SELECT id, name, status, template_slug, subject, preview_text
FROM public.email_campaigns
WHERE template_slug = 'system-update-aug-2026'
ORDER BY created_at DESC;
