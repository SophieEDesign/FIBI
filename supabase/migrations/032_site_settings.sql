-- Site-wide settings (e.g. email footer address for CAN-SPAM).
-- Read: authenticated. Write: admin only via service role or RLS.

CREATE TABLE IF NOT EXISTS public.site_settings (
  key text PRIMARY KEY,
  value text NOT NULL DEFAULT ''
);

ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can read (profile page needs it for admin UI)
DROP POLICY IF EXISTS "Authenticated can read site_settings" ON public.site_settings;
CREATE POLICY "Authenticated can read site_settings"
  ON public.site_settings FOR SELECT
  TO authenticated
  USING (true);

-- Only admins can update (enforced in API via requireAdmin + service role)
DROP POLICY IF EXISTS "Admins can update site_settings" ON public.site_settings;
CREATE POLICY "Admins can update site_settings"
  ON public.site_settings FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

-- Seed email footer address (empty by default)
INSERT INTO public.site_settings (key, value) VALUES ('email_footer_address', '')
ON CONFLICT (key) DO NOTHING;
