-- Prevent role escalation: profiles.role can only be changed by superuser/migrations
-- (e.g. via Dashboard or migration). Stops clients from setting role = 'admin' via RLS UPDATE.

CREATE OR REPLACE FUNCTION public.prevent_profiles_role_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.role IS DISTINCT FROM NEW.role THEN
    RAISE EXCEPTION 'Cannot change profiles.role via application; use Dashboard or migration'
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_profiles_role_immutable ON public.profiles;
CREATE TRIGGER enforce_profiles_role_immutable
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION prevent_profiles_role_change();
