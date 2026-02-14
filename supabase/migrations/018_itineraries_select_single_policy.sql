-- Single SELECT policy for itineraries: owners see their own, anyone can see if there's an active share.
-- Replaces the two separate policies to avoid any conflict or missing policy.

DROP POLICY IF EXISTS "Users can view their own itineraries" ON itineraries;
DROP POLICY IF EXISTS "Public can view itinerary when it has an active share" ON itineraries;

CREATE POLICY "itineraries_select_owner_or_shared"
  ON itineraries
  FOR SELECT
  USING (
    auth.uid() = user_id
    OR
    EXISTS (
      SELECT 1 FROM itinerary_shares
      WHERE itinerary_shares.itinerary_id = itineraries.id
      AND itinerary_shares.revoked_at IS NULL
    )
  );
