-- Public trip boards: publish a trip with a stable slug (indexable URL).
-- Private collaborate/copy shares via itinerary_shares remain unchanged.

ALTER TABLE itineraries
  ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS public_slug TEXT;

-- Unique slug when set (partial unique index)
CREATE UNIQUE INDEX IF NOT EXISTS idx_itineraries_public_slug
  ON itineraries (public_slug)
  WHERE public_slug IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_itineraries_published_at
  ON itineraries (published_at DESC)
  WHERE published_at IS NOT NULL;

-- Public can read published itineraries (trip boards)
DROP POLICY IF EXISTS "Public can view published trip boards" ON itineraries;
CREATE POLICY "Public can view published trip boards"
  ON itineraries
  FOR SELECT
  USING (published_at IS NOT NULL AND public_slug IS NOT NULL);

-- RPC: get items for a published trip board by slug (security definer, no auth required)
CREATE OR REPLACE FUNCTION public.get_published_board_items(slug_param TEXT)
RETURNS SETOF saved_items
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  board_id UUID;
BEGIN
  SELECT id INTO board_id
  FROM itineraries
  WHERE public_slug = slug_param
    AND published_at IS NOT NULL;

  IF board_id IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT si.*
  FROM saved_items si
  WHERE si.itinerary_id = board_id
  ORDER BY si.trip_position ASC NULLS LAST, si.created_at ASC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_published_board_items(TEXT) TO anon, authenticated;

-- RPC: get published board metadata + author display
CREATE OR REPLACE FUNCTION public.get_published_board(slug_param TEXT)
RETURNS TABLE (
  id UUID,
  name TEXT,
  notes TEXT,
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
    i.notes,
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
