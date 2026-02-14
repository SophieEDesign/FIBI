-- Allow public to read an itinerary when it has an active (non-revoked) share.
-- Without this, GET /api/itinerary/share/[token] could read itinerary_shares but not
-- the itinerary row, so shared links returned 404 "Share not found or revoked".

DROP POLICY IF EXISTS "Public can view itinerary when it has an active share" ON itineraries;

CREATE POLICY "Public can view itinerary when it has an active share"
  ON itineraries
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM itinerary_shares
      WHERE itinerary_shares.itinerary_id = itineraries.id
      AND itinerary_shares.revoked_at IS NULL
    )
  );
