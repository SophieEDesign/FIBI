-- Run in the PRODUCTION Supabase project (yjvztlidisxkxkarjfce)
-- SQL Editor: https://supabase.com/dashboard/project/yjvztlidisxkxkarjfce/sql/new
-- Safe to re-run (ON CONFLICT / NOT EXISTS).
--
-- Creates the "We've updated FIBI" email template + a draft campaign.
-- Review/send from Admin → Emails → Campaigns (does not send automatically).

INSERT INTO public.email_templates (name, slug, subject, html_content, is_active)
VALUES (
  'System Update — August 2026',
  'system-update-aug-2026',
  'We''ve updated FIBI',
  $html$
<h2 style="margin:0 0 16px;font-size:24px;font-weight:600;color:#171717;">We've updated FIBI</h2>
<p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#374151;">
  A few quiet improvements to help you save places, organise trips, and share them when you're ready.
</p>

<p style="margin:24px 0 8px;font-size:16px;font-weight:600;color:#171717;">Share a Travel Board</p>
<p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#374151;">
  Open a trip and tap <strong>Share board</strong>. You get a calm public link anyone can open — no account needed to look.
</p>

<p style="margin:24px 0 8px;font-size:16px;font-weight:600;color:#171717;">Travel Guides</p>
<p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#374151;">
  Curated lists you can save straight into your own board. Start with
  <a href="https://fibi.world/travel-guides/north-wales-hidden-gems" style="color:#2563eb;text-decoration:underline;">8 hidden gems in North Wales</a>,
  or browse more on
  <a href="https://fibi.world/travel-guides" style="color:#2563eb;text-decoration:underline;">Travel Guides</a>.
</p>

<p style="margin:24px 0 8px;font-size:16px;font-weight:600;color:#171717;">Continue with Google</p>
<p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#374151;">
  Sign in a little faster when you next open FIBI — Google is there alongside email.
</p>

<p style="margin:28px 0 0;text-align:center;">
  <a href="https://fibi.world/login" style="display:inline-block;padding:14px 28px;background:#2563eb;color:#ffffff;text-decoration:none;border-radius:8px;font-weight:600;font-size:16px;">Open FIBI</a>
</p>
<p style="margin:24px 0 0;font-size:14px;color:#6b7280;">
  As always, reply if something feels off — we read every message.
</p>
$html$,
  true
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  subject = EXCLUDED.subject,
  html_content = EXCLUDED.html_content,
  is_active = EXCLUDED.is_active,
  updated_at = now();

INSERT INTO public.email_campaigns (
  name,
  template_slug,
  filters,
  status,
  subject,
  preview_text,
  from_name,
  from_email
)
SELECT
  'We''ve updated FIBI — August 2026',
  'system-update-aug-2026',
  '{"confirmed": true}'::jsonb,
  'draft',
  'We''ve updated FIBI',
  'Travel Boards you can share, Travel Guides, and Continue with Google.',
  'FiBi',
  'hello@fibi.world'
WHERE NOT EXISTS (
  SELECT 1
  FROM public.email_campaigns
  WHERE template_slug = 'system-update-aug-2026'
    AND name = 'We''ve updated FIBI — August 2026'
);

-- Confirm what was created
SELECT slug, name, subject, is_active
FROM public.email_templates
WHERE slug = 'system-update-aug-2026';

SELECT id, name, status, template_slug, subject, preview_text
FROM public.email_campaigns
WHERE template_slug = 'system-update-aug-2026'
ORDER BY created_at DESC;
