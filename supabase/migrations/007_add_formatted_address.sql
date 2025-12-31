-- Add formatted_address column to saved_items table
ALTER TABLE saved_items 
ADD COLUMN IF NOT EXISTS formatted_address TEXT;

