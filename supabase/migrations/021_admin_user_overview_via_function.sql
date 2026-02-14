-- Replace admin_user_overview view with SECURITY DEFINER functions (service_role only)
-- to fix auth_users_exposed and security_definer_view lints.

DROP VIEW IF EXISTS public.admin_user_overview;

-- Single row by user id (or no row). Same shape as former view.
CREATE OR REPLACE FUNCTION public.get_admin_user_overview_by_id(p_user_id uuid)
RETURNS TABLE (
  id uuid,
  email text,
  email_confirmed_at timestamptz,
  created_at timestamptz,
  welcome_email_sent boolean,
  onboarding_nudge_sent boolean,
  founding_followup_sent boolean,
  places_count int
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    u.id,
    u.email,
    u.email_confirmed_at,
    u.created_at,
    COALESCE(p.welcome_email_sent, false),
    COALESCE(p.onboarding_nudge_sent, false),
    COALESCE(p.founding_followup_sent, false),
    COALESCE(places.cnt, 0)::int
  FROM auth.users u
  LEFT JOIN public.profiles p ON p.id = u.id
  LEFT JOIN (
    SELECT user_id, COUNT(*)::int AS cnt
    FROM public.saved_items
    GROUP BY user_id
  ) places ON places.user_id = u.id
  WHERE u.id = p_user_id;
$$;

REVOKE EXECUTE ON FUNCTION public.get_admin_user_overview_by_id(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_admin_user_overview_by_id(uuid) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.get_admin_user_overview_by_id(uuid) TO service_role;

-- Rows eligible for founding follow-up: email confirmed, founding_followup_sent = false.
CREATE OR REPLACE FUNCTION public.get_admin_user_overview_founding_eligible()
RETURNS TABLE (
  id uuid,
  email text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    u.id,
    u.email
  FROM auth.users u
  LEFT JOIN public.profiles p ON p.id = u.id
  WHERE u.email_confirmed_at IS NOT NULL
    AND COALESCE(p.founding_followup_sent, false) = false;
$$;

REVOKE EXECUTE ON FUNCTION public.get_admin_user_overview_founding_eligible() FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_admin_user_overview_founding_eligible() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.get_admin_user_overview_founding_eligible() TO service_role;
