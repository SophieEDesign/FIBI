-- Give every new user an example trip + pin so the app isn't empty on first open.
-- Examples are flagged so admin activation metrics still reflect real saves.

ALTER TABLE public.itineraries
  ADD COLUMN IF NOT EXISTS is_example boolean NOT NULL DEFAULT false;

ALTER TABLE public.saved_items
  ADD COLUMN IF NOT EXISTS is_example boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.itineraries.is_example IS 'Starter example trip seeded on signup; excluded from activation metrics.';
COMMENT ON COLUMN public.saved_items.is_example IS 'Starter example place seeded on signup; excluded from activation metrics.';

CREATE OR REPLACE FUNCTION public.seed_example_trip_for_user(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_itinerary_id uuid;
BEGIN
  -- Idempotent: never add examples if the user already has any trip or place.
  IF EXISTS (
    SELECT 1 FROM public.itineraries WHERE user_id = p_user_id
  ) OR EXISTS (
    SELECT 1 FROM public.saved_items WHERE user_id = p_user_id
  ) THEN
    RETURN;
  END IF;

  INSERT INTO public.itineraries (user_id, name, notes, cover_image_url, is_example)
  VALUES (
    p_user_id,
    'Example trip · Lisbon',
    'Just to show how a trip looks. Delete anytime.',
    'https://images.unsplash.com/photo-1555881403-64995e2242e5?w=1200&q=80',
    true
  )
  RETURNING id INTO v_itinerary_id;

  INSERT INTO public.saved_items (
    user_id,
    url,
    platform,
    title,
    description,
    thumbnail_url,
    notes,
    location_country,
    location_city,
    place_name,
    latitude,
    longitude,
    formatted_address,
    category,
    liked,
    visited,
    planned,
    itinerary_id,
    trip_position,
    location_status,
    is_example
  ) VALUES (
    p_user_id,
    'https://www.google.com/maps/place/Time+Out+Market+Lisboa/@38.7068,-9.1456,17z',
    'Web',
    'Time Out Market',
    'A food hall by the river — go early before the counters get busy.',
    'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&q=80',
    'An example pin so you can see how places look on the map. Delete anytime.',
    'Portugal',
    'Lisbon',
    'Time Out Market Lisboa',
    38.7068,
    -9.1456,
    'Av. 24 de Julho 49, 1200-479 Lisboa, Portugal',
    'Food',
    false,
    false,
    false,
    v_itinerary_id,
    1,
    'resolved',
    true
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
    'user'
  )
  ON CONFLICT (id) DO NOTHING;

  PERFORM public.seed_example_trip_for_user(NEW.id);

  RETURN NEW;
END;
$$;

-- Backfill empty accounts only (users with no trips and no places yet).
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT p.id
    FROM public.profiles p
    WHERE NOT EXISTS (SELECT 1 FROM public.itineraries i WHERE i.user_id = p.id)
      AND NOT EXISTS (SELECT 1 FROM public.saved_items s WHERE s.user_id = p.id)
  LOOP
    PERFORM public.seed_example_trip_for_user(r.id);
  END LOOP;
END;
$$;

-- Activation metrics ignore seeded examples.
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
  WHERE is_example = false
  GROUP BY user_id
) places ON places.user_id = p.id
LEFT JOIN (
  SELECT
    user_id,
    MIN(created_at) AS first_trip_at,
    MAX(created_at) AS last_trip_at,
    COUNT(*)::int AS trips_count
  FROM public.itineraries
  WHERE is_example = false
  GROUP BY user_id
) trips ON trips.user_id = p.id;

COMMENT ON VIEW public.admin_activation_stats IS 'Per-user activation stats for admin dashboard. Excludes seeded example trips/places. Read with service_role only.';

REVOKE SELECT ON public.admin_activation_stats FROM anon;
REVOKE SELECT ON public.admin_activation_stats FROM authenticated;
GRANT SELECT ON public.admin_activation_stats TO service_role;
