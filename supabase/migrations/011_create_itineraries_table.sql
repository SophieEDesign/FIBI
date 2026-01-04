-- Create itineraries table
CREATE TABLE IF NOT EXISTS itineraries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create index on user_id for faster queries
CREATE INDEX IF NOT EXISTS idx_itineraries_user_id ON itineraries(user_id);

-- Create index on created_at for sorting
CREATE INDEX IF NOT EXISTS idx_itineraries_created_at ON itineraries(created_at DESC);

-- Enable Row Level Security
ALTER TABLE itineraries ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for idempotency)
DROP POLICY IF EXISTS "Users can view their own itineraries" ON itineraries;
DROP POLICY IF EXISTS "Users can insert their own itineraries" ON itineraries;
DROP POLICY IF EXISTS "Users can update their own itineraries" ON itineraries;
DROP POLICY IF EXISTS "Users can delete their own itineraries" ON itineraries;

-- RLS Policy: Users can only view their own itineraries
CREATE POLICY "Users can view their own itineraries"
  ON itineraries
  FOR SELECT
  USING (auth.uid() = user_id);

-- RLS Policy: Users can only insert their own itineraries
CREATE POLICY "Users can insert their own itineraries"
  ON itineraries
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- RLS Policy: Users can only update their own itineraries
CREATE POLICY "Users can update their own itineraries"
  ON itineraries
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- RLS Policy: Users can only delete their own itineraries
CREATE POLICY "Users can delete their own itineraries"
  ON itineraries
  FOR DELETE
  USING (auth.uid() = user_id);

-- Add foreign key constraint to saved_items
-- Drop constraint if it exists (for idempotency)
ALTER TABLE saved_items
DROP CONSTRAINT IF EXISTS fk_saved_items_itinerary;

-- Add the constraint
ALTER TABLE saved_items
ADD CONSTRAINT fk_saved_items_itinerary
FOREIGN KEY (itinerary_id) REFERENCES itineraries(id) ON DELETE SET NULL;

