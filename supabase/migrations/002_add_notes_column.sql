-- Add notes column to saved_items table
ALTER TABLE saved_items 
ADD COLUMN IF NOT EXISTS notes TEXT;

