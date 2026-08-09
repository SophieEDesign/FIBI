-- Guide view beacons + save conversions for admin performance.

CREATE TABLE IF NOT EXISTS public.travel_guide_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  guide_id uuid NOT NULL REFERENCES public.travel_guides(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_travel_guide_views_guide_created
  ON public.travel_guide_views (guide_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.travel_guide_saves (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  guide_id uuid NOT NULL REFERENCES public.travel_guides(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_travel_guide_saves_guide_created
  ON public.travel_guide_saves (guide_id, created_at DESC);

ALTER TABLE public.travel_guide_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.travel_guide_saves ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.travel_guide_views FROM anon, authenticated;
REVOKE ALL ON public.travel_guide_saves FROM anon, authenticated;
GRANT SELECT, INSERT ON public.travel_guide_views TO service_role;
GRANT SELECT, INSERT ON public.travel_guide_saves TO service_role;
