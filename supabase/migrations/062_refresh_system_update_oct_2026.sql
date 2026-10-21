-- Refresh "FIBI's had an upgrade" template + draft campaign (Oct 2026).
-- Safe to re-run (ON CONFLICT / UPDATE).

INSERT INTO public.email_templates (name, slug, subject, html_content, is_active)
VALUES (
  'System Update — October 2026',
  'system-update-aug-2026',
  'FIBI''s had an upgrade',
  $html$
<h2 style="margin:0 0 16px;font-size:24px;font-weight:600;color:#171717;">FIBI's had an upgrade</h2>
<p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#374151;">
  A few quiet improvements to help you save places, find them again, and share a trip when you're ready.
</p>

<p style="margin:24px 0 8px;font-size:16px;font-weight:600;color:#171717;">Places, clearer</p>
<p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#374151;">
  Save from the toolbar or the map. Filter what you've kept. See everything in one calm place.
</p>

<p style="margin:24px 0 8px;font-size:16px;font-weight:600;color:#171717;">Share a Travel Board</p>
<p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#374151;">
  Open a trip and tap <strong>Share board</strong>. Anyone can open the link — no account needed to look.
</p>

<p style="margin:24px 0 8px;font-size:16px;font-weight:600;color:#171717;">Travel Guides</p>
<p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#374151;">
  Curated lists you can save straight into your own board. Start with
  <a href="https://fibi.world/travel-guides/north-wales-hidden-gems" style="color:#2563eb;text-decoration:underline;">8 hidden gems in North Wales</a>,
  or browse more on
  <a href="https://fibi.world/travel-guides" style="color:#2563eb;text-decoration:underline;">Travel Guides</a>.
</p>

<p style="margin:28px 0 0;text-align:center;">
  <a href="https://fibi.world/app" style="display:inline-block;padding:14px 28px;background:#2563eb;color:#ffffff;text-decoration:none;border-radius:8px;font-weight:600;font-size:16px;">Open FIBI</a>
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

UPDATE public.email_campaigns
SET
  name = 'FIBI''s had an upgrade — October 2026',
  subject = 'FIBI''s had an upgrade',
  preview_text = 'Places are easier to save and find. Share a board when you''re ready.',
  from_name = 'FiBi',
  from_email = 'hello@fibi.world',
  filters = '{"confirmed": true}'::jsonb,
  updated_at = now()
WHERE template_slug = 'system-update-aug-2026'
  AND status = 'draft';
