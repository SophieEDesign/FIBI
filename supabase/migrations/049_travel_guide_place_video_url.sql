-- Optional video/social URL separate from editorial reference source_url
ALTER TABLE public.travel_guide_places
  ADD COLUMN IF NOT EXISTS video_url TEXT;
