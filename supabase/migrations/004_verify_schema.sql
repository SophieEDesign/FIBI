-- Verification and cleanup migration
-- This ensures all columns exist and indexes are in place

-- Add notes column if it doesn't exist
ALTER TABLE saved_items 
ADD COLUMN IF NOT EXISTS notes TEXT;

-- Add screenshot_url column if it doesn't exist
ALTER TABLE saved_items 
ADD COLUMN IF NOT EXISTS screenshot_url TEXT;

-- Ensure indexes exist
CREATE INDEX IF NOT EXISTS idx_saved_items_user_id ON saved_items(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_items_created_at ON saved_items(created_at DESC);

-- Ensure RLS is enabled
ALTER TABLE saved_items ENABLE ROW LEVEL SECURITY;

-- Ensure trigger exists for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_saved_items_updated_at ON saved_items;
CREATE TRIGGER update_saved_items_updated_at
  BEFORE UPDATE ON saved_items
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

