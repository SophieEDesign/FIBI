-- Fix 500 on itineraries select: use a SECURITY DEFINER function for the "has active share" check
-- so RLS evaluation doesn't cause server errors.

-- Helper: true if this itinerary has an active (non-revoked) share. Bypasses RLS.
CREATE OR REPLACE FUNCTION public.itinerary_has_active_share(p_itinerary_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM itinerary_shares
    WHERE itinerary_id = p_itinerary_id
    AND revoked_at IS NULL
  );
$$;

-- Grant execute to anon and authenticated (needed for RLS USING clause)
GRANT EXECUTE ON FUNCTION public.itinerary_has_active_share(uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.itinerary_has_active_share(uuid) TO authenticated;

-- Replace the policy with one that uses the function (no inline EXISTS in RLS)
DROP POLICY IF EXISTS "itineraries_select_owner_or_shared" ON itineraries;
DROP POLICY IF EXISTS "Users can view their own itineraries" ON itineraries;
DROP POLICY IF EXISTS "Public can view itinerary when it has an active share" ON itineraries;

CREATE POLICY "itineraries_select_owner_or_shared"
  ON itineraries
  FOR SELECT
  USING (
    auth.uid() = user_id
    OR public.itinerary_has_active_share(id)
  );
