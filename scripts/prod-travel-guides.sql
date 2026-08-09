-- Run in the PRODUCTION Supabase project (yjvztlidisxkxkarjfce)
-- SQL Editor: https://supabase.com/dashboard/project/yjvztlidisxkxkarjfce/sql/new
-- Safe to re-run (IF NOT EXISTS / ON CONFLICT).

-- ========== Schema ==========
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

ALTER TABLE public.travel_guide_places
  ADD COLUMN IF NOT EXISTS video_url TEXT;

CREATE INDEX IF NOT EXISTS travel_guide_places_guide_order_idx
  ON public.travel_guide_places (guide_id, display_order);

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

-- ========== North Wales guide ==========
INSERT INTO travel_guides (
  title, slug, excerpt, introduction,
  destination_name, region, country,
  cover_image_url, seo_title, seo_description,
  status, featured, author_name
) VALUES (
  '8 Hidden Gems in North Wales Worth Saving',
  'north-wales-hidden-gems',
  'Think you know North Wales? Save these for your next road trip.',
  $intro$
Beyond Yr Wyddfa, Conwy Castle and the usual tourist stops, North Wales is full of quiet lakes, tiny villages, forest walks and coastal spots that are ridiculously easy to scroll past and immediately forget where you found them.

We've picked eight places worth adding to your FIBI Travel Board — from mountain reflections in Eryri to an old fishing village tucked away on the Llŷn Peninsula.
$intro$,
  'North Wales',
  'Wales',
  'United Kingdom',
  'https://images.unsplash.com/photo-1486299267070-83823f5448dd?w=1600&q=80',
  '8 Hidden Gems in North Wales Worth Saving | FIBI',
  'Quiet lakes, coastal villages and Eryri walks worth saving to your FIBI Travel Board for the next North Wales road trip.',
  'published',
  true,
  'FIBI'
)
ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title,
  excerpt = EXCLUDED.excerpt,
  introduction = EXCLUDED.introduction,
  destination_name = EXCLUDED.destination_name,
  region = EXCLUDED.region,
  country = EXCLUDED.country,
  cover_image_url = EXCLUDED.cover_image_url,
  seo_title = EXCLUDED.seo_title,
  seo_description = EXCLUDED.seo_description,
  status = 'published',
  featured = true,
  updated_at = now();

DELETE FROM travel_guide_places
WHERE guide_id = (SELECT id FROM travel_guides WHERE slug = 'north-wales-hidden-gems');

INSERT INTO travel_guide_places (
  guide_id, name, description, section, display_order,
  latitude, longitude, location_city, location_country,
  source_url, source_platform, image_url
)
SELECT g.id, v.name, v.description, v.section, v.display_order,
  v.latitude, v.longitude, v.location_city, v.location_country,
  v.source_url, v.source_platform, v.image_url
FROM travel_guides g
CROSS JOIN (VALUES
  (
    'Beddgelert & Aberglaslyn Pass',
    $d1$
Beddgelert is one of those Welsh villages that looks almost suspiciously picturesque: stone cottages, mountain scenery and the Glaslyn and Colwyn rivers meeting right through the village.

Rather than just stopping for coffee, follow the riverside towards Aberglaslyn Pass. There are walks connecting Beddgelert with the gorge, old copper workings, Llyn Dinas and the surrounding mountains.

FIBI tip: Save Beddgelert as the base and the Aberglaslyn walk as a separate place.
$d1$,
    'Villages & walks', 0, 53.0117::float8, -4.1019::float8,
    'Eryri · Gwynedd', 'United Kingdom',
    'https://www.visitwales.com/destinations/north-wales/eryri-snowdonia-mountains-and-coast/things-do-kids-family-break-beddgelert',
    'Web', 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80'
  ),
  (
    'Llynnau Mymbyr',
    $d2$
This is the North Wales view you've probably seen online without knowing where it was.

The twin lakes at Capel Curig sit beneath the Eryri peaks and, in calm weather, create those huge mountain reflections that look almost unreal. Visit Wales specifically highlights Llynnau Mymbyr as one of Eryri's most picturesque locations.

This one is less about doing loads and more about stopping, wandering and taking in the view.

FIBI tip: One for a sunrise/sunset board.
$d2$,
    'Lakes & viewpoints', 1, 53.097::float8, -3.912::float8,
    'Capel Curig · Eryri', 'United Kingdom',
    'https://www.visitwales.com/things-do/nature-and-landscapes/national-parks/eryri-snowdonia-national-park-what-see-and-do',
    'Web', 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800&q=80'
  ),
  (
    'Llyn Crafnant',
    $d3$
A mountain lake tucked above Trefriw, surrounded by forest.

You reach Llyn Crafnant by climbing away from the Conwy Valley on smaller roads, which is part of what makes it feel so removed from the busier Eryri stops. There are several waymarked walks around the lake and surrounding landscape.

It's exactly the sort of place FIBI is made for: you see a reel of it, save it and six months later realise it's twenty minutes from somewhere you're already visiting.
$d3$,
    'Lakes & viewpoints', 2, 53.133::float8, -3.866::float8,
    'Trefriw · Conwy Valley', 'United Kingdom',
    'https://www.visitconwy.org.uk/explore/ideas-inspiration/the-north-wales-way/walking-trails/',
    'Web', 'https://images.unsplash.com/photo-1439066615861-d1af74d74000?w=800&q=80'
  ),
  (
    'Fairy Glen',
    $d4$
Just outside Betws-y-Coed is a little wooded gorge where the River Conwy runs between moss-covered rocks.

It's considerably moodier and more enclosed than the huge landscapes elsewhere in Eryri — think woodland, rushing water and proper Welsh fairytale energy. Visit Conwy recommends it as one of the quieter nature stops outside the village.

Good for: woodland walks · photography · autumn trips
$d4$,
    'Hidden nature', 3, 53.083::float8, -3.795::float8,
    'Betws-y-Coed · Conwy', 'United Kingdom',
    'https://www.visitconwy.org.uk/explore/ideas-inspiration/day-in-betws-y-coed/',
    'Web', 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=800&q=80'
  ),
  (
    'Porthdinllaen',
    $d5$
This one is gorgeous.

Porthdinllaen is an old fishing village curled around a sheltered bay on the Llŷn Peninsula. You approach on foot rather than simply driving into the village, which makes arriving at the beach feel even better.

There's clear water, fishing cottages and Tŷ Coch Inn sitting right on the beach. The bay also contains an important seagrass habitat.

Good for: coastal walks · beach days · pub stops · sunsets
$d5$,
    'Coast', 4, 52.942::float8, -4.563::float8,
    'Llŷn Peninsula · Gwynedd', 'United Kingdom',
    'https://www.nationaltrust.org.uk/visit/wales/porthdinllaen',
    'Web', 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&q=80'
  ),
  (
    'Ynys Llanddwyn',
    $d6$
Technically a tidal island, Llanddwyn sits at the end of a beautiful stretch of Anglesey coastline.

You've got dunes, huge views back towards the mountains of Eryri, lighthouse scenery and miles of coast around it. Visit Wales specifically highlights Llanddwyn as one of North Wales' standout coastal landscapes.

Good for: walks · beaches · photography · romantic weekend board
$d6$,
    'Coast', 5, 53.138::float8, -4.412::float8,
    'Anglesey', 'United Kingdom',
    'https://www.visitwales.com/destinations/north-wales/reasons-visit-north-wales',
    'Web', 'https://images.unsplash.com/photo-1486299267070-83823f5448dd?w=800&q=80'
  ),
  (
    'Cwm Idwal',
    $d7$
If you want the drama of Eryri without necessarily climbing Yr Wyddfa, save Cwm Idwal.

It's a spectacular glacial landscape surrounded by steep mountain walls, centred around Llyn Idwal. It also has some rather good history attached: Charles Darwin studied geology in the area, while the surrounding mountains were used for mountaineering training by members of the Everest expeditions.

Good for: hiking · mountain scenery · dramatic-weather photographs
$d7$,
    'Mountains', 6, 53.116::float8, -4.026::float8,
    'Ogwen Valley · Eryri', 'United Kingdom',
    'https://www.visitwales.com/things-do/nature-and-landscapes/national-parks/eryri-snowdonia-national-park-what-see-and-do',
    'Web', 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800&q=80'
  ),
  (
    'Llyn Geirionydd',
    $d8$
And this is a lovely last one because it combines several things.

Llyn Geirionydd is hidden amongst the hills and woodland of Gwydir Forest, with walking routes connecting the lake with nearby Llyn Crafnant. It's also a spot for non-motorised watersports, and the north bank has a monument to Welsh poet Taliesin.

You could very easily combine Geirionydd + Crafnant + Betws-y-Coed into one day.
$d8$,
    'Lakes & viewpoints', 7, 53.142::float8, -3.848::float8,
    'Gwydir Forest · near Trefriw', 'United Kingdom',
    'https://naturalresourceswales.gov.uk/days-out/places-to-visit/north-west-wales/gwydir-llyn-geirionydd/?lang=en',
    'Web', 'https://images.unsplash.com/photo-1439066615861-d1af74d74000?w=800&q=80'
  )
) AS v(name, description, section, display_order, latitude, longitude, location_city, location_country, source_url, source_platform, image_url)
WHERE g.slug = 'north-wales-hidden-gems';
