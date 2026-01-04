-- Create itinerary_shares table for sharing itineraries
CREATE TABLE IF NOT EXISTS itinerary_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  itinerary_id UUID NOT NULL REFERENCES itineraries(id) ON DELETE CASCADE,
  share_token TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  revoked_at TIMESTAMPTZ
);

-- Create index on share_token for fast lookups
CREATE INDEX IF NOT EXISTS idx_itinerary_shares_token ON itinerary_shares(share_token);

-- Create index on itinerary_id for faster queries
CREATE INDEX IF NOT EXISTS idx_itinerary_shares_itinerary_id ON itinerary_shares(itinerary_id);

-- Enable Row Level Security
ALTER TABLE itinerary_shares ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for idempotency)
DROP POLICY IF EXISTS "Users can view their own itinerary shares" ON itinerary_shares;
DROP POLICY IF EXISTS "Users can insert their own itinerary shares" ON itinerary_shares;
DROP POLICY IF EXISTS "Users can update their own itinerary shares" ON itinerary_shares;
DROP POLICY IF EXISTS "Public can view active shares" ON itinerary_shares;

-- RLS Policy: Users can view their own itinerary shares
CREATE POLICY "Users can view their own itinerary shares"
  ON itinerary_shares
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM itineraries
      WHERE itineraries.id = itinerary_shares.itinerary_id
      AND itineraries.user_id = auth.uid()
    )
  );

-- RLS Policy: Users can insert their own itinerary shares
CREATE POLICY "Users can insert their own itinerary shares"
  ON itinerary_shares
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM itineraries
      WHERE itineraries.id = itinerary_shares.itinerary_id
      AND itineraries.user_id = auth.uid()
    )
  );

-- RLS Policy: Users can update their own itinerary shares (for revoking)
CREATE POLICY "Users can update their own itinerary shares"
  ON itinerary_shares
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM itineraries
      WHERE itineraries.id = itinerary_shares.itinerary_id
      AND itineraries.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM itineraries
      WHERE itineraries.id = itinerary_shares.itinerary_id
      AND itineraries.user_id = auth.uid()
    )
  );

-- RLS Policy: Public can view active (non-revoked) shares
-- This allows unauthenticated users to view shared itineraries
CREATE POLICY "Public can view active shares"
  ON itinerary_shares
  FOR SELECT
  USING (revoked_at IS NULL);

-- Create a function to get items for a shared itinerary
-- This function can be called without authentication and bypasses RLS
CREATE OR REPLACE FUNCTION get_shared_itinerary_items(share_token_param TEXT)
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
SECURITY DEFINER
AS $$
BEGIN
  -- Verify the share token exists and is active
  IF EXISTS (
    SELECT 1 FROM itinerary_shares
    WHERE share_token = share_token_param
    AND revoked_at IS NULL
  ) THEN
    -- Return items for the shared itinerary
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
      si.latitude,
      si.longitude,
      si.formatted_address,
      si.category,
      si.status,
      si.notes,
      si.planned_date,
      si.itinerary_id,
      si.created_at,
      si.updated_at
    FROM saved_items si
    INNER JOIN itinerary_shares ish ON si.itinerary_id = ish.itinerary_id
    WHERE ish.share_token = share_token_param
    AND ish.revoked_at IS NULL
    ORDER BY si.planned_date ASC NULLS LAST, si.created_at DESC;
  END IF;
  
  -- Return empty result if share token is invalid or revoked
  RETURN;
END;
$$;

-- Grant execute permission to anon and authenticated users
GRANT EXECUTE ON FUNCTION get_shared_itinerary_items(TEXT) TO anon, authenticated;

