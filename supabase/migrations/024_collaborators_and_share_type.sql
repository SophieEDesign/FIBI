-- Collaborate vs copy: itinerary_collaborators table, share_type on itinerary_shares,
-- and RLS so collaborators can read/write the same itinerary and its items.

-- 1. Add share_type to itinerary_shares (default 'copy' for backward compatibility with existing links)
ALTER TABLE itinerary_shares
  ADD COLUMN IF NOT EXISTS share_type TEXT NOT NULL DEFAULT 'copy'
    CHECK (share_type IN ('link_view', 'copy', 'collaborate'));

-- 2. Create itinerary_collaborators table
CREATE TABLE IF NOT EXISTS itinerary_collaborators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  itinerary_id UUID NOT NULL REFERENCES itineraries(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  invited_email TEXT,
  invited_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  joined_at TIMESTAMPTZ,
  invited_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT at_least_one_identifier CHECK (
    (user_id IS NOT NULL) OR (invited_email IS NOT NULL AND invited_email <> '')
  )
);

CREATE INDEX IF NOT EXISTS idx_itinerary_collaborators_itinerary_id ON itinerary_collaborators(itinerary_id);
CREATE INDEX IF NOT EXISTS idx_itinerary_collaborators_user_id ON itinerary_collaborators(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_itinerary_collaborators_itinerary_user
  ON itinerary_collaborators(itinerary_id, user_id) WHERE user_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_itinerary_collaborators_itinerary_email
  ON itinerary_collaborators(itinerary_id, lower(trim(invited_email))) WHERE invited_email IS NOT NULL AND trim(invited_email) <> '';

ALTER TABLE itinerary_collaborators ENABLE ROW LEVEL SECURITY;

-- Owner can do everything; collaborators can read list for that itinerary
DROP POLICY IF EXISTS "Owner can manage collaborators" ON itinerary_collaborators;
CREATE POLICY "Owner can manage collaborators"
  ON itinerary_collaborators
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM itineraries
      WHERE itineraries.id = itinerary_collaborators.itinerary_id
      AND itineraries.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM itineraries
      WHERE itineraries.id = itinerary_collaborators.itinerary_id
      AND itineraries.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Collaborators can view list" ON itinerary_collaborators;
CREATE POLICY "Collaborators can view list"
  ON itinerary_collaborators
  FOR SELECT
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM itineraries
      WHERE itineraries.id = itinerary_collaborators.itinerary_id
      AND itineraries.user_id = auth.uid()
    )
  );

-- 3. Helper: user can access itinerary (owner or joined collaborator)
CREATE OR REPLACE FUNCTION public.user_can_access_itinerary(p_itinerary_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM itineraries
    WHERE id = p_itinerary_id AND user_id = p_user_id
  )
  OR EXISTS (
    SELECT 1 FROM itinerary_collaborators
    WHERE itinerary_id = p_itinerary_id AND user_id = p_user_id AND joined_at IS NOT NULL
  );
$$;

GRANT EXECUTE ON FUNCTION public.user_can_access_itinerary(uuid, uuid) TO anon, authenticated;

-- 4. Itineraries: allow SELECT and UPDATE for owner or collaborator (INSERT/DELETE stay owner-only via existing policies)
-- 019 created "itineraries_select_owner_or_shared" - we need to extend so collaborators also see the itinerary.
-- Replace with a policy that: owner OR has active share OR is collaborator
DROP POLICY IF EXISTS "itineraries_select_owner_or_shared" ON itineraries;
CREATE POLICY "itineraries_select_owner_or_shared"
  ON itineraries
  FOR SELECT
  USING (
    auth.uid() = user_id
    OR public.itinerary_has_active_share(id)
    OR public.user_can_access_itinerary(id, auth.uid())
  );

-- Allow collaborators to update itinerary (e.g. name)
DROP POLICY IF EXISTS "Users can update their own itineraries" ON itineraries;
CREATE POLICY "Users can update their own itineraries"
  ON itineraries
  FOR UPDATE
  USING (auth.uid() = user_id OR public.user_can_access_itinerary(id, auth.uid()))
  WITH CHECK (auth.uid() = user_id OR public.user_can_access_itinerary(id, auth.uid()));

-- 5. saved_items: allow access when user owns the item OR can access the item's itinerary (owner/collaborator)
DROP POLICY IF EXISTS "Users can view their own saved items" ON saved_items;
CREATE POLICY "Users can view their own saved items"
  ON saved_items
  FOR SELECT
  USING (
    auth.uid() = user_id
    OR (itinerary_id IS NOT NULL AND public.user_can_access_itinerary(itinerary_id, auth.uid()))
  );

DROP POLICY IF EXISTS "Users can insert their own saved items" ON saved_items;
CREATE POLICY "Users can insert their own saved items"
  ON saved_items
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND (itinerary_id IS NULL OR public.user_can_access_itinerary(itinerary_id, auth.uid()))
  );

DROP POLICY IF EXISTS "Users can update their own saved items" ON saved_items;
CREATE POLICY "Users can update their own saved items"
  ON saved_items
  FOR UPDATE
  USING (
    auth.uid() = user_id
    OR (itinerary_id IS NOT NULL AND public.user_can_access_itinerary(itinerary_id, auth.uid()))
  )
  WITH CHECK (
    auth.uid() = user_id
    OR (itinerary_id IS NOT NULL AND public.user_can_access_itinerary(itinerary_id, auth.uid()))
  );

DROP POLICY IF EXISTS "Users can delete their own saved items" ON saved_items;
CREATE POLICY "Users can delete their own saved items"
  ON saved_items
  FOR DELETE
  USING (
    auth.uid() = user_id
    OR (itinerary_id IS NOT NULL AND public.user_can_access_itinerary(itinerary_id, auth.uid()))
  );
