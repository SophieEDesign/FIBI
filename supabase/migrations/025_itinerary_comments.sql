-- Comments on itineraries (for owner and collaborators to communicate)

CREATE TABLE IF NOT EXISTS itinerary_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  itinerary_id UUID NOT NULL REFERENCES itineraries(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_itinerary_comments_itinerary_id ON itinerary_comments(itinerary_id);
CREATE INDEX IF NOT EXISTS idx_itinerary_comments_created_at ON itinerary_comments(created_at);

ALTER TABLE itinerary_comments ENABLE ROW LEVEL SECURITY;

-- Users who can access the itinerary (owner or collaborator) can read and insert comments
CREATE POLICY "Users who can access itinerary can select comments"
  ON itinerary_comments
  FOR SELECT
  USING (public.user_can_access_itinerary(itinerary_id, auth.uid()));

CREATE POLICY "Users who can access itinerary can insert comments"
  ON itinerary_comments
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND public.user_can_access_itinerary(itinerary_id, auth.uid())
  );
