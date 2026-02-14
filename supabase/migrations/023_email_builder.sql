-- Email Builder: templates, automations, logs.
-- RLS: only service_role (used by API) can access.

CREATE TABLE IF NOT EXISTS public.email_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  subject text NOT NULL,
  html_content text NOT NULL DEFAULT '',
  is_active boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.email_automations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  template_slug text NOT NULL REFERENCES public.email_templates(slug) ON DELETE RESTRICT,
  trigger_type text NOT NULL CHECK (trigger_type IN ('user_confirmed', 'user_inactive', 'place_added', 'itinerary_created', 'manual')),
  conditions jsonb NOT NULL DEFAULT '{}',
  delay_hours integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.email_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  template_slug text NOT NULL,
  automation_id uuid REFERENCES public.email_automations(id) ON DELETE SET NULL,
  sent_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'failed'))
);

CREATE INDEX IF NOT EXISTS idx_email_automations_is_active ON public.email_automations(is_active);
CREATE INDEX IF NOT EXISTS idx_email_templates_slug ON public.email_templates(slug);
CREATE INDEX IF NOT EXISTS idx_email_logs_user_sent ON public.email_logs(user_id, sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_logs_automation ON public.email_logs(automation_id);

CREATE OR REPLACE FUNCTION public.update_email_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_email_templates_updated_at ON public.email_templates;
CREATE TRIGGER trigger_email_templates_updated_at
  BEFORE UPDATE ON public.email_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_email_templates_updated_at();

ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_automations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;

-- No policies for anon/authenticated; service_role bypasses RLS.
COMMENT ON TABLE public.email_templates IS 'HTML email templates for automations.';
COMMENT ON TABLE public.email_automations IS 'Condition-based email automations (daily cron).';
COMMENT ON TABLE public.email_logs IS 'Audit log of sent automation emails.';
