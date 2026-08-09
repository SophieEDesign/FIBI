-- Public FIBI Travel Guides (editorial/SEO). Separate from user Travel Boards (itineraries).

CREATE TABLE IF NOT EXISTS public.travel_guides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  excerpt TEXT,
  introduction TEXT,
  destination_name TEXT,
  city TEXT,
  region TEXT,
  country TEXT,
  cover_image_url TEXT,
  seo_title TEXT,
  seo_description TEXT,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'published', 'archived')),
  featured BOOLEAN NOT NULL DEFAULT false,
  author_name TEXT NOT NULL DEFAULT 'FIBI',
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS travel_guides_status_published_at_idx
  ON public.travel_guides (status, published_at DESC NULLS LAST);

CREATE INDEX IF NOT EXISTS travel_guides_country_idx
  ON public.travel_guides (country)
  WHERE status = 'published';

CREATE INDEX IF NOT EXISTS travel_guides_featured_idx
  ON public.travel_guides (featured)
  WHERE status = 'published' AND featured = true;

CREATE TABLE IF NOT EXISTS public.travel_guide_places (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guide_id UUID NOT NULL REFERENCES public.travel_guides(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  section TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  formatted_address TEXT,
  location_city TEXT,
  location_country TEXT,
  place_id TEXT,
  source_url TEXT,
  source_platform TEXT,
  image_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS travel_guide_places_guide_order_idx
  ON public.travel_guide_places (guide_id, display_order);

-- Keep updated_at fresh
CREATE OR REPLACE FUNCTION public.set_travel_guides_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS travel_guides_updated_at ON public.travel_guides;
CREATE TRIGGER travel_guides_updated_at
  BEFORE UPDATE ON public.travel_guides
  FOR EACH ROW
  EXECUTE FUNCTION public.set_travel_guides_updated_at();

DROP TRIGGER IF EXISTS travel_guide_places_updated_at ON public.travel_guide_places;
CREATE TRIGGER travel_guide_places_updated_at
  BEFORE UPDATE ON public.travel_guide_places
  FOR EACH ROW
  EXECUTE FUNCTION public.set_travel_guides_updated_at();

-- Auto-set / clear published_at from status
CREATE OR REPLACE FUNCTION public.travel_guides_sync_published_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.status = 'published' THEN
      NEW.published_at = COALESCE(NEW.published_at, now());
    END IF;
    RETURN NEW;
  END IF;

  IF NEW.status = 'published' AND (OLD.status IS DISTINCT FROM 'published') THEN
    NEW.published_at = COALESCE(NEW.published_at, now());
  ELSIF NEW.status = 'draft' AND OLD.status IS DISTINCT FROM 'draft' THEN
    NEW.published_at = NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS travel_guides_sync_published_at ON public.travel_guides;
CREATE TRIGGER travel_guides_sync_published_at
  BEFORE INSERT OR UPDATE OF status ON public.travel_guides
  FOR EACH ROW
  EXECUTE FUNCTION public.travel_guides_sync_published_at();

ALTER TABLE public.travel_guides ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.travel_guide_places ENABLE ROW LEVEL SECURITY;

-- Public read: published guides only
DROP POLICY IF EXISTS "Anyone can read published travel guides" ON public.travel_guides;
CREATE POLICY "Anyone can read published travel guides"
  ON public.travel_guides
  FOR SELECT
  USING (status = 'published');

DROP POLICY IF EXISTS "Anyone can read places on published guides" ON public.travel_guide_places;
CREATE POLICY "Anyone can read places on published guides"
  ON public.travel_guide_places
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.travel_guides g
      WHERE g.id = travel_guide_places.guide_id
        AND g.status = 'published'
    )
  );

-- Admin full access (role on profiles — not user-editable metadata)
DROP POLICY IF EXISTS "Admins manage travel guides" ON public.travel_guides;
CREATE POLICY "Admins manage travel guides"
  ON public.travel_guides
  FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

DROP POLICY IF EXISTS "Admins manage travel guide places" ON public.travel_guide_places;
CREATE POLICY "Admins manage travel guide places"
  ON public.travel_guide_places
  FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

GRANT SELECT ON public.travel_guides TO anon, authenticated;
GRANT SELECT ON public.travel_guide_places TO anon, authenticated;
GRANT ALL ON public.travel_guides TO authenticated;
GRANT ALL ON public.travel_guide_places TO authenticated;
