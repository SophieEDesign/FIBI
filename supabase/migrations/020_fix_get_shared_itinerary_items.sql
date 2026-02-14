-- Fix 500 on GET /api/itinerary/share/[token]: set search_path and cast numeric columns
-- so the RPC runs reliably for anon callers.

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
      si.created_at,
      si.updated_at
    FROM public.saved_items si
    INNER JOIN public.itinerary_shares ish ON si.itinerary_id = ish.itinerary_id
    WHERE ish.share_token = share_token_param
    AND ish.revoked_at IS NULL
    ORDER BY si.planned_date ASC NULLS LAST, si.created_at DESC;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_shared_itinerary_items(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.get_shared_itinerary_items(TEXT) TO authenticated;
