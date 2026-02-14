-- Avoid RLS recursion: itineraries SELECT policy previously used EXISTS (SELECT FROM itinerary_shares),
-- and itinerary_shares RLS can reference itineraries, which can cause 500 in some cases.
-- Use a SECURITY DEFINER function so the "has active share?" check does not go through itinerary_shares RLS.

CREATE OR REPLACE FUNCTION public.itinerary_has_active_share(p_itinerary_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM itinerary_shares
    WHERE itinerary_id = p_itinerary_id
    AND revoked_at IS NULL
  );
$$;

GRANT EXECUTE ON FUNCTION public.itinerary_has_active_share(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.itinerary_has_active_share(UUID) TO anon;

-- Replace the SELECT policy to use the function
DROP POLICY IF EXISTS "itineraries_select_owner_or_shared" ON itineraries;

CREATE POLICY "itineraries_select_owner_or_shared"
  ON itineraries
  FOR SELECT
  USING (
    auth.uid() = user_id
    OR public.itinerary_has_active_share(id)
  );
