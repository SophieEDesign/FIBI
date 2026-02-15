-- Trips container model: optional trip-level dates, ordered places via trip_position

-- Add optional start_date and end_date to itineraries (trips)
ALTER TABLE itineraries
ADD COLUMN IF NOT EXISTS start_date DATE,
ADD COLUMN IF NOT EXISTS end_date DATE;

-- Add trip_position for ordering places within a trip
ALTER TABLE saved_items
ADD COLUMN IF NOT EXISTS trip_position INTEGER;

CREATE INDEX IF NOT EXISTS idx_saved_items_itinerary_trip_position
ON saved_items(itinerary_id, trip_position)
WHERE itinerary_id IS NOT NULL;

-- Update get_shared_itinerary_items to order by trip_position then created_at
CREATE OR REPLACE FUNCTION public.get_shared_itinerary_items(share_token_param TEXT)
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
  status TEXT,
  notes TEXT,
  planned_date DATE,
  itinerary_id UUID,
  trip_position INTEGER,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.itinerary_shares
    WHERE share_token = share_token_param
    AND revoked_at IS NULL
  ) THEN
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
      si.status,
      si.notes,
      si.planned_date,
      si.itinerary_id,
      si.trip_position,
      si.created_at,
      si.updated_at
    FROM public.saved_items si
    INNER JOIN public.itinerary_shares ish ON si.itinerary_id = ish.itinerary_id
    WHERE ish.share_token = share_token_param
    AND ish.revoked_at IS NULL
    ORDER BY si.trip_position ASC NULLS LAST, si.created_at DESC;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_shared_itinerary_items(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.get_shared_itinerary_items(TEXT) TO authenticated;
