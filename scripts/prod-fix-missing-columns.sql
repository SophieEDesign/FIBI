-- Apply on prod project yjvztlidisxkxkarjfce (SQL Editor).
-- Fixes: cannot add a place (missing location_status)
--         admin email log 500 (missing error_detail)

-- 046_location_status
ALTER TABLE saved_items
  ADD COLUMN IF NOT EXISTS location_status TEXT;

ALTER TABLE saved_items
  DROP CONSTRAINT IF EXISTS saved_items_location_status_check;

ALTER TABLE saved_items
  ADD CONSTRAINT saved_items_location_status_check
  CHECK (
    location_status IS NULL
    OR location_status IN ('resolved', 'needs_review', 'unknown')
  );

UPDATE saved_items
SET location_status = CASE
  WHEN latitude IS NOT NULL AND longitude IS NOT NULL THEN 'resolved'
  WHEN place_name IS NOT NULL
    OR location_city IS NOT NULL
    OR location_country IS NOT NULL
    OR place_id IS NOT NULL THEN 'needs_review'
  ELSE 'unknown'
END
WHERE location_status IS NULL;

CREATE INDEX IF NOT EXISTS idx_saved_items_location_status
  ON saved_items (user_id, location_status)
  WHERE location_status IS DISTINCT FROM 'resolved';

-- 054_email_logs_error_detail
ALTER TABLE public.email_logs
  ADD COLUMN IF NOT EXISTS error_detail text;

COMMENT ON COLUMN public.email_logs.error_detail IS 'Resend or send-path failure message when status = failed.';
