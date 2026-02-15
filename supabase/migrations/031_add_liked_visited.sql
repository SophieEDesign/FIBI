-- Add liked and visited boolean columns for simple icon states (replacing Stage)
ALTER TABLE saved_items
  ADD COLUMN IF NOT EXISTS liked BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS visited BOOLEAN DEFAULT false;
