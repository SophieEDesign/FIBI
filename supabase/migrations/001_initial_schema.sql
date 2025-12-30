-- Create saved_items table
CREATE TABLE IF NOT EXISTS saved_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  platform TEXT NOT NULL,
  title TEXT,
  description TEXT,
  thumbnail_url TEXT,
  location_country TEXT,
  location_city TEXT,
  category TEXT,
  status TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create index on user_id for faster queries
CREATE INDEX IF NOT EXISTS idx_saved_items_user_id ON saved_items(user_id);

-- Create index on created_at for sorting
CREATE INDEX IF NOT EXISTS idx_saved_items_created_at ON saved_items(created_at DESC);

-- Enable Row Level Security
ALTER TABLE saved_items ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for idempotency)
DROP POLICY IF EXISTS "Users can view their own saved items" ON saved_items;
DROP POLICY IF EXISTS "Users can insert their own saved items" ON saved_items;
DROP POLICY IF EXISTS "Users can update their own saved items" ON saved_items;
DROP POLICY IF EXISTS "Users can delete their own saved items" ON saved_items;

-- RLS Policy: Users can only view their own saved items
CREATE POLICY "Users can view their own saved items"
  ON saved_items
  FOR SELECT
  USING (auth.uid() = user_id);

-- RLS Policy: Users can only insert their own saved items
CREATE POLICY "Users can insert their own saved items"
  ON saved_items
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- RLS Policy: Users can only update their own saved items
CREATE POLICY "Users can update their own saved items"
  ON saved_items
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- RLS Policy: Users can only delete their own saved items
CREATE POLICY "Users can delete their own saved items"
  ON saved_items
  FOR DELETE
  USING (auth.uid() = user_id);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Drop trigger if it exists (for idempotency)
DROP TRIGGER IF EXISTS update_saved_items_updated_at ON saved_items;

-- Trigger to automatically update updated_at
CREATE TRIGGER update_saved_items_updated_at
  BEFORE UPDATE ON saved_items
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

