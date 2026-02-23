-- Add planned boolean for per-card "planned" state (tick icon)
ALTER TABLE saved_items
  ADD COLUMN IF NOT EXISTS planned BOOLEAN DEFAULT false;
