-- Shareable travel boards: public projection only (no private notes/user_id),
-- RPC-first public reads, tighten SELECT policies, owner-only shareable flag.

ALTER TABLE itineraries
  ADD COLUMN IF NOT EXISTS public_description TEXT;

-- Whitelist public board metadata (no private notes)
DROP FUNCTION IF EXISTS public.get_published_board(TEXT);
CREATE OR REPLACE FUNCTION public.get_published_board(slug_param TEXT)
RETURNS TABLE (
  id UUID,
  name TEXT,
  public_description TEXT,
  cover_image_url TEXT,
  start_date DATE,
  end_date DATE,
  published_at TIMESTAMPTZ,
  public_slug TEXT,
  author_name TEXT,
  place_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    i.id,
    i.name,
    i.public_description,
    i.cover_image_url,
    i.start_date,
    i.end_date,
    i.published_at,
    i.public_slug,
    COALESCE(NULLIF(TRIM(p.full_name), ''), 'Traveller')::TEXT AS author_name,
    (SELECT COUNT(*) FROM saved_items si WHERE si.itinerary_id = i.id) AS place_count
  FROM itineraries i
  LEFT JOIN profiles p ON p.id = i.user_id
  WHERE i.public_slug = slug_param
    AND i.published_at IS NOT NULL;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_published_board(TEXT) TO anon, authenticated;

-- Whitelist public board items (no notes, no user_id, no liked/visited flags)
DROP FUNCTION IF EXISTS public.get_published_board_items(TEXT);
CREATE OR REPLACE FUNCTION public.get_published_board_items(slug_param TEXT)
RETURNS TABLE (
  id UUID,
  url TEXT,
  platform TEXT,
  title TEXT,
  description TEXT,
  thumbnail_url TEXT,
  screenshot_url TEXT,
  location_country TEXT,
  location_city TEXT,
  place_name TEXT,
  place_id TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  formatted_address TEXT,
  category TEXT,
  trip_position INTEGER,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  board_id UUID;
BEGIN
  SELECT i.id INTO board_id
  FROM itineraries i
  WHERE i.public_slug = slug_param
    AND i.published_at IS NOT NULL;

  IF board_id IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    si.id,
    si.url,
    si.platform,
    si.title,
    si.description,
    si.thumbnail_url,
    si.screenshot_url,
    si.location_country,
    si.location_city,
    si.place_name,
    si.place_id,
    si.latitude::double precision,
    si.longitude::double precision,
    si.formatted_address,
    si.category,
    si.trip_position,
    si.created_at
  FROM saved_items si
  WHERE si.itinerary_id = board_id
  ORDER BY si.trip_position ASC NULLS LAST, si.created_at ASC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_published_board_items(TEXT) TO anon, authenticated;

-- Sitemap helper: only public slugs (no private fields)
CREATE OR REPLACE FUNCTION public.list_published_board_slugs()
RETURNS TABLE (
  public_slug TEXT,
  published_at TIMESTAMPTZ
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT i.public_slug, i.published_at
  FROM itineraries i
  WHERE i.published_at IS NOT NULL
    AND i.public_slug IS NOT NULL
  ORDER BY i.published_at DESC
  LIMIT 500;
$$;

GRANT EXECUTE ON FUNCTION public.list_published_board_slugs() TO anon, authenticated;

-- Shared itinerary meta by token (so we can drop broad SELECT via share existence)
CREATE OR REPLACE FUNCTION public.get_shared_itinerary_meta(share_token_param TEXT)
RETURNS TABLE (
  id UUID,
  name TEXT,
  start_date DATE,
  end_date DATE,
  cover_image_url TEXT,
  created_at TIMESTAMPTZ,
  share_type TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    i.id,
    i.name,
    i.start_date,
    i.end_date,
    i.cover_image_url,
    i.created_at,
    ish.share_type
  FROM itinerary_shares ish
  INNER JOIN itineraries i ON i.id = ish.itinerary_id
  WHERE ish.share_token = share_token_param
    AND ish.revoked_at IS NULL;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_shared_itinerary_meta(TEXT) TO anon, authenticated;

-- Drop direct public SELECT of published itinerary rows (use RPCs instead)
DROP POLICY IF EXISTS "Public can view published trip boards" ON itineraries;

-- Tighten SELECT: owner or collaborator only — not "any active share exists"
DROP POLICY IF EXISTS "itineraries_select_owner_or_shared" ON itineraries;
DROP POLICY IF EXISTS "Public can view itinerary when it has an active share" ON itineraries;
CREATE POLICY "itineraries_select_owner_or_collaborator"
  ON itineraries
  FOR SELECT
  USING (
    auth.uid() = user_id
    OR public.user_can_access_itinerary(id, auth.uid())
  );

-- Owner-only control of shareable/public fields
CREATE OR REPLACE FUNCTION public.enforce_owner_only_publish()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (
    NEW.published_at IS DISTINCT FROM OLD.published_at
    OR NEW.public_slug IS DISTINCT FROM OLD.public_slug
    OR NEW.public_description IS DISTINCT FROM OLD.public_description
  ) AND NEW.user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Only the board owner can change shareable settings';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_owner_only_publish ON itineraries;
CREATE TRIGGER trg_enforce_owner_only_publish
  BEFORE UPDATE ON itineraries
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_owner_only_publish();
