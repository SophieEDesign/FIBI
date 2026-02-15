-- Trip cover image and notes for moodboard upgrade
ALTER TABLE public.itineraries
  ADD COLUMN IF NOT EXISTS cover_image_url TEXT,
  ADD COLUMN IF NOT EXISTS notes TEXT;
