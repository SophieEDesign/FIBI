-- Add optional role to itinerary_collaborators for clarity and future extension.
-- Owner is still only in itineraries.user_id; all rows here are collaborators.

ALTER TABLE itinerary_collaborators
  ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'collaborator'
  CHECK (role IN ('owner', 'collaborator'));
