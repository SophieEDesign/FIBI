-- Add screenshot_url column to saved_items table
ALTER TABLE saved_items 
ADD COLUMN IF NOT EXISTS screenshot_url TEXT;

