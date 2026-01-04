-- Add itinerary_id column to saved_items table
-- This prepares the calendar structure for future support of multiple named itineraries
-- For now, all items will have itinerary_id = NULL (default global calendar)
-- In the future, users can create multiple itineraries (e.g., "Weekend trip", "Italy ideas", "World trip")

ALTER TABLE saved_items
ADD COLUMN IF NOT EXISTS itinerary_id UUID;

-- Add index for faster queries when filtering by itinerary
CREATE INDEX IF NOT EXISTS idx_saved_items_itinerary_id ON saved_items(itinerary_id);

-- Note: We're not creating an itineraries table yet, as per the requirement:
-- "Do NOT implement sharing or collaboration yet."
-- "Ensure architecture does not assume a single global calendar."
-- 
-- Future migration will create:
-- CREATE TABLE itineraries (
--   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
--   user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
--   name TEXT NOT NULL,
--   created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
--   updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
-- );
-- 
-- And add foreign key:
-- ALTER TABLE saved_items
-- ADD CONSTRAINT fk_saved_items_itinerary
-- FOREIGN KEY (itinerary_id) REFERENCES itineraries(id) ON DELETE SET NULL;

