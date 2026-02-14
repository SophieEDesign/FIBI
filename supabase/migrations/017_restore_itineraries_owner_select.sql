-- Restore "Users can view their own itineraries" so owners always see their itineraries.
-- (Public shared-link policy from 016 is unchanged; both SELECT policies apply with OR.)

DROP POLICY IF EXISTS "Users can view their own itineraries" ON itineraries;

CREATE POLICY "Users can view their own itineraries"
  ON itineraries
  FOR SELECT
  USING (auth.uid() = user_id);
