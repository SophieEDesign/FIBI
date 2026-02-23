-- Allow reading itinerary comments via valid share token (for shared itinerary view).
-- SECURITY DEFINER so we can read comments without auth.uid().
-- itinerary_id_param restricts results to that itinerary when the token is for it.

CREATE OR REPLACE FUNCTION public.get_shared_itinerary_comments(
  share_token_param TEXT,
  itinerary_id_param UUID
)
RETURNS TABLE (
  id UUID,
  itinerary_id UUID,
  user_id UUID,
  body TEXT,
  created_at TIMESTAMPTZ,
  author_name TEXT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id,
    c.itinerary_id,
    c.user_id,
    c.body,
    c.created_at,
    COALESCE(NULLIF(TRIM(p.full_name), ''), 'Someone')::TEXT AS author_name
  FROM public.itinerary_comments c
  INNER JOIN public.itinerary_shares s ON s.itinerary_id = c.itinerary_id
  LEFT JOIN public.profiles p ON p.id = c.user_id
  WHERE s.share_token = share_token_param
    AND s.revoked_at IS NULL
    AND c.itinerary_id = itinerary_id_param
  ORDER BY c.created_at ASC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_shared_itinerary_comments(TEXT, UUID) TO anon;
GRANT EXECUTE ON FUNCTION public.get_shared_itinerary_comments(TEXT, UUID) TO authenticated;
