-- Add planned_date column to saved_items table
ALTER TABLE saved_items 
ADD COLUMN IF NOT EXISTS planned_date DATE;

-- Create index on planned_date for faster calendar queries
CREATE INDEX IF NOT EXISTS idx_saved_items_planned_date ON saved_items(planned_date);



