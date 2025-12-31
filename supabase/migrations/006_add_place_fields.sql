-- Add Google Places fields to saved_items table
ALTER TABLE saved_items 
ADD COLUMN IF NOT EXISTS place_name TEXT;

ALTER TABLE saved_items 
ADD COLUMN IF NOT EXISTS place_id TEXT;

ALTER TABLE saved_items 
ADD COLUMN IF NOT EXISTS latitude NUMERIC(10, 8);

ALTER TABLE saved_items 
ADD COLUMN IF NOT EXISTS longitude NUMERIC(11, 8);

