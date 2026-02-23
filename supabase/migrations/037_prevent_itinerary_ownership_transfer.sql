-- Prevent ownership transfer: itineraries.user_id must not be changed after insert.
-- This closes the gap where a collaborator could UPDATE user_id to themselves.

CREATE OR REPLACE FUNCTION public.prevent_itinerary_owner_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.user_id IS DISTINCT FROM NEW.user_id THEN
    RAISE EXCEPTION 'Cannot change itinerary owner (user_id is immutable)'
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_itinerary_owner_immutable ON itineraries;
CREATE TRIGGER enforce_itinerary_owner_immutable
  BEFORE UPDATE ON itineraries
  FOR EACH ROW
  EXECUTE FUNCTION prevent_itinerary_owner_change();
