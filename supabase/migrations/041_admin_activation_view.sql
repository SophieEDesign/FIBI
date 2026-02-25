-- Admin activation stats: one row per user (profiles + saved_items + itineraries).
-- Used by admin API with service_role. No auth.users in view so it stays in public schema.
-- RLS: deny anon/authenticated; service_role bypasses.

CREATE OR REPLACE VIEW public.admin_activation_stats AS
SELECT
  p.id AS user_id,
  places.first_place_at,
  places.last_place_at,
  places.places_count,
  trips.first_trip_at,
  trips.last_trip_at,
  trips.trips_count
FROM public.profiles p
LEFT JOIN (
  SELECT
    user_id,
    MIN(created_at) AS first_place_at,
    MAX(updated_at) AS last_place_at,
    COUNT(*)::int AS places_count
  FROM public.saved_items
  GROUP BY user_id
) places ON places.user_id = p.id
LEFT JOIN (
  SELECT
    user_id,
    MIN(created_at) AS first_trip_at,
    MAX(created_at) AS last_trip_at,
    COUNT(*)::int AS trips_count
  FROM public.itineraries
  GROUP BY user_id
) trips ON trips.user_id = p.id;

COMMENT ON VIEW public.admin_activation_stats IS 'Per-user activation stats for admin dashboard. Read with service_role only.';

REVOKE SELECT ON public.admin_activation_stats FROM anon;
REVOKE SELECT ON public.admin_activation_stats FROM authenticated;
GRANT SELECT ON public.admin_activation_stats TO service_role;
