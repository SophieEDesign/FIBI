-- PRODUCTION ONLY — run deliberately in Supabase SQL Editor.
-- Project: yjvztlidisxkxkarjfce
--
-- Why: migration 040 added marketing_opt_in DEFAULT false with no backfill.
-- Campaigns / automations only send when marketing_opt_in = true, so every
-- campaign currently matches 0 recipients.
--
-- This opts in people who already showed interest via product email:
--   - welcome_email_sent = true (received a welcome / product email), OR
--   - email_verified_at set (confirmed email for tips/updates)
-- It does NOT opt in everyone. Review the preview counts before UPDATE.
--
-- Preview (run first):
SELECT
  count(*) FILTER (WHERE marketing_opt_in) AS currently_opted_in,
  count(*) FILTER (
    WHERE NOT marketing_opt_in
      AND (welcome_email_sent IS TRUE OR email_verified_at IS NOT NULL)
  ) AS would_opt_in,
  count(*) AS total_profiles
FROM public.profiles;

-- Apply:
UPDATE public.profiles
SET
  marketing_opt_in = true,
  updated_at = now()
WHERE marketing_opt_in = false
  AND (
    welcome_email_sent IS TRUE
    OR email_verified_at IS NOT NULL
  );

-- Optional: also treat Auth-confirmed users as opted in.
-- Uncomment only if you want that broader set (Auth email_confirmed_at).
-- UPDATE public.profiles p
-- SET marketing_opt_in = true, updated_at = now()
-- WHERE p.marketing_opt_in = false
--   AND EXISTS (
--     SELECT 1 FROM auth.users u
--     WHERE u.id = p.id AND u.email_confirmed_at IS NOT NULL
--   );
