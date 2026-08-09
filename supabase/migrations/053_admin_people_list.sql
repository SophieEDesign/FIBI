-- Admin people list + counts for paginated admin UI (service_role only).
-- Joins auth.users with profiles and activation stats.

CREATE OR REPLACE FUNCTION public.admin_person_state(
  p_email_confirmed_at timestamptz,
  p_places_count int,
  p_last_login_at timestamptz
)
RETURNS text
LANGUAGE sql
STABLE
AS $$
  SELECT CASE
    WHEN p_email_confirmed_at IS NULL THEN 'awaiting_confirmation'
    WHEN COALESCE(p_places_count, 0) = 0 THEN 'confirmed_no_save'
    WHEN p_last_login_at IS NULL
      OR p_last_login_at < (now() - interval '30 days') THEN 'dormant'
    ELSE 'activated'
  END;
$$;

CREATE OR REPLACE FUNCTION public.list_admin_people(
  p_q text DEFAULT NULL,
  p_state text DEFAULT NULL,
  p_limit int DEFAULT 50,
  p_offset int DEFAULT 0
)
RETURNS TABLE (
  id uuid,
  email text,
  email_confirmed_at timestamptz,
  created_at timestamptz,
  last_login_at timestamptz,
  first_place_added_at timestamptz,
  first_trip_created_at timestamptz,
  last_activity_at timestamptz,
  places_count int,
  trips_count int,
  welcome_email_sent boolean,
  onboarding_nudge_sent boolean,
  state text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH base AS (
    SELECT
      u.id,
      u.email::text AS email,
      COALESCE(p.email_verified_at, u.email_confirmed_at) AS email_confirmed_at,
      u.created_at,
      u.last_sign_in_at AS last_login_at,
      a.first_place_at AS first_place_added_at,
      a.first_trip_at AS first_trip_created_at,
      (
        SELECT MAX(v)
        FROM (VALUES
          (u.last_sign_in_at),
          (a.last_place_at),
          (a.last_trip_at)
        ) AS t(v)
      ) AS last_activity_at,
      COALESCE(a.places_count, 0)::int AS places_count,
      COALESCE(a.trips_count, 0)::int AS trips_count,
      COALESCE(p.welcome_email_sent, false) AS welcome_email_sent,
      COALESCE(p.onboarding_nudge_sent, false) AS onboarding_nudge_sent
    FROM auth.users u
    LEFT JOIN public.profiles p ON p.id = u.id
    LEFT JOIN public.admin_activation_stats a ON a.user_id = u.id
  ),
  with_state AS (
    SELECT
      b.*,
      public.admin_person_state(b.email_confirmed_at, b.places_count, b.last_login_at) AS state
    FROM base b
  )
  SELECT *
  FROM with_state w
  WHERE
    (p_q IS NULL OR p_q = '' OR w.email ILIKE '%' || p_q || '%')
    AND (p_state IS NULL OR p_state = '' OR w.state = p_state)
  ORDER BY w.created_at DESC
  LIMIT GREATEST(1, LEAST(COALESCE(p_limit, 50), 200))
  OFFSET GREATEST(0, COALESCE(p_offset, 0));
$$;

CREATE OR REPLACE FUNCTION public.count_admin_people(
  p_q text DEFAULT NULL,
  p_state text DEFAULT NULL
)
RETURNS bigint
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH base AS (
    SELECT
      u.id,
      u.email::text AS email,
      COALESCE(p.email_verified_at, u.email_confirmed_at) AS email_confirmed_at,
      u.last_sign_in_at AS last_login_at,
      COALESCE(a.places_count, 0)::int AS places_count
    FROM auth.users u
    LEFT JOIN public.profiles p ON p.id = u.id
    LEFT JOIN public.admin_activation_stats a ON a.user_id = u.id
  ),
  with_state AS (
    SELECT
      b.*,
      public.admin_person_state(b.email_confirmed_at, b.places_count, b.last_login_at) AS state
    FROM base b
  )
  SELECT COUNT(*)::bigint
  FROM with_state w
  WHERE
    (p_q IS NULL OR p_q = '' OR w.email ILIKE '%' || p_q || '%')
    AND (p_state IS NULL OR p_state = '' OR w.state = p_state);
$$;

REVOKE ALL ON FUNCTION public.admin_person_state(timestamptz, int, timestamptz) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.list_admin_people(text, text, int, int) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.count_admin_people(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_person_state(timestamptz, int, timestamptz) TO service_role;
GRANT EXECUTE ON FUNCTION public.list_admin_people(text, text, int, int) TO service_role;
GRANT EXECUTE ON FUNCTION public.count_admin_people(text, text) TO service_role;
