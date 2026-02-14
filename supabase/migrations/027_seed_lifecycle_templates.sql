-- Seed lifecycle email templates and automations

-- 1. Welcome (Early Access) - active
INSERT INTO public.email_templates (name, slug, subject, html_content, is_active)
VALUES (
  'Welcome (Early Access)',
  'welcome-early-access',
  'Welcome to FIBI ✨ (early access)',
  '<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head><body style="margin:0;padding:24px;font-family:-apple-system,BlinkMacSystemFont,''Segoe UI'',Roboto,sans-serif;line-height:1.6;color:#171717;">
<h2>Welcome to FIBI</h2>
<p>You''re one of the early users — thank you for trying it.</p>
<p>FIBI is built to help you save and organise places you don''t want to forget.</p>
<p>To start:</p>
<ol>
  <li>Add one place you''ve saved recently</li>
  <li>Create a trip</li>
  <li>See how it feels</li>
</ol>
<p>
  <a href="https://fibi.world/login" style="display:inline-block;padding:14px 26px;background:#3b82f6;color:#ffffff;text-decoration:none;border-radius:999px;">Open FIBI</a>
</p>
<p style="margin-top:24px;color:#777;font-size:14px;">It''s still evolving — feedback is genuinely welcome.</p>
</body></html>',
  true
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  subject = EXCLUDED.subject,
  html_content = EXCLUDED.html_content,
  updated_at = now();

INSERT INTO public.email_automations (name, template_slug, trigger_type, conditions, delay_hours, is_active)
SELECT 'Welcome (Early Access)', 'welcome-early-access', 'user_confirmed', '{"confirmed": true}'::jsonb, 0, true
WHERE NOT EXISTS (SELECT 1 FROM public.email_automations WHERE template_slug = 'welcome-early-access');

-- 2. First Login Nudge - active
INSERT INTO public.email_templates (name, slug, subject, html_content, is_active)
VALUES (
  'First Login Nudge',
  'first-login-nudge',
  'Have you added your first place yet?',
  '<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head><body style="margin:0;padding:24px;font-family:-apple-system,BlinkMacSystemFont,''Segoe UI'',Roboto,sans-serif;line-height:1.6;color:#171717;">
<h2>Quick one</h2>
<p>Most people save travel ideas in screenshots or folders they never revisit.</p>
<p>Try adding just one place inside FIBI — it takes less than a minute.</p>
<p>
  <a href="https://fibi.world/login" style="display:inline-block;padding:14px 26px;background:#3b82f6;color:#ffffff;text-decoration:none;border-radius:999px;">Add your first place</a>
</p>
</body></html>',
  true
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  subject = EXCLUDED.subject,
  html_content = EXCLUDED.html_content,
  updated_at = now();

INSERT INTO public.email_automations (name, template_slug, trigger_type, conditions, delay_hours, is_active)
SELECT 'First Login Nudge', 'first-login-nudge', 'user_confirmed', '{"last_login_days_gt": 0, "places_count_lt": 1}'::jsonb, 24, true
WHERE NOT EXISTS (SELECT 1 FROM public.email_automations WHERE template_slug = 'first-login-nudge');

-- 3. First Place Added (Encouragement) - inactive
INSERT INTO public.email_templates (name, slug, subject, html_content, is_active)
VALUES (
  'First Place Added',
  'first-place-added',
  'Nice start 👀',
  '<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head><body style="margin:0;padding:24px;font-family:-apple-system,BlinkMacSystemFont,''Segoe UI'',Roboto,sans-serif;line-height:1.6;color:#171717;">
<h2>Nice start</h2>
<p>You''ve added your first place.</p>
<p>Want to organise it into a trip?</p>
<p>
  <a href="https://fibi.world/login" style="display:inline-block;padding:14px 26px;background:#3b82f6;color:#ffffff;text-decoration:none;border-radius:999px;">Create a trip</a>
</p>
</body></html>',
  false
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  subject = EXCLUDED.subject,
  html_content = EXCLUDED.html_content,
  updated_at = now();

INSERT INTO public.email_automations (name, template_slug, trigger_type, conditions, delay_hours, is_active)
SELECT 'First Place Added', 'first-place-added', 'place_added', '{"places_count_gt": 0, "places_count_lt": 2}'::jsonb, 0, false
WHERE NOT EXISTS (SELECT 1 FROM public.email_automations WHERE template_slug = 'first-place-added');

-- 4. Inactive Reminder (7 Days) - active
INSERT INTO public.email_templates (name, slug, subject, html_content, is_active)
VALUES (
  'Inactive Reminder (7 Days)',
  'inactive-reminder-7d',
  'Your saved places are waiting ✈️',
  '<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head><body style="margin:0;padding:24px;font-family:-apple-system,BlinkMacSystemFont,''Segoe UI'',Roboto,sans-serif;line-height:1.6;color:#171717;">
<h2>Still planning something?</h2>
<p>Your saved places are still there — ready when you are.</p>
<p>
  <a href="https://fibi.world/login" style="display:inline-block;padding:14px 26px;background:#3b82f6;color:#ffffff;text-decoration:none;border-radius:999px;">Open FIBI</a>
</p>
</body></html>',
  true
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  subject = EXCLUDED.subject,
  html_content = EXCLUDED.html_content,
  updated_at = now();

INSERT INTO public.email_automations (name, template_slug, trigger_type, conditions, delay_hours, is_active)
SELECT 'Inactive Reminder (7 Days)', 'inactive-reminder-7d', 'user_inactive', '{"last_login_days_gt": 7, "places_count_gt": 0}'::jsonb, 0, true
WHERE NOT EXISTS (SELECT 1 FROM public.email_automations WHERE template_slug = 'inactive-reminder-7d');

-- 5. Itinerary Created Share - inactive
INSERT INTO public.email_templates (name, slug, subject, html_content, is_active)
VALUES (
  'Itinerary Created Share',
  'itinerary-created-share',
  'Your trip is coming together ✨',
  '<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head><body style="margin:0;padding:24px;font-family:-apple-system,BlinkMacSystemFont,''Segoe UI'',Roboto,sans-serif;line-height:1.6;color:#171717;">
<h2>Your trip is coming together</h2>
<p>You''ve created an itinerary.</p>
<p>Want to share it with friends or keep building it?</p>
<p>
  <a href="https://fibi.world/login" style="display:inline-block;padding:14px 26px;background:#3b82f6;color:#ffffff;text-decoration:none;border-radius:999px;">View your trip</a>
</p>
</body></html>',
  false
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  subject = EXCLUDED.subject,
  html_content = EXCLUDED.html_content,
  updated_at = now();

INSERT INTO public.email_automations (name, template_slug, trigger_type, conditions, delay_hours, is_active)
SELECT 'Itinerary Created Share', 'itinerary-created-share', 'itinerary_created', '{}'::jsonb, 0, false
WHERE NOT EXISTS (SELECT 1 FROM public.email_automations WHERE template_slug = 'itinerary-created-share');

-- 6. Feature Update (Manual Broadcast) - inactive
INSERT INTO public.email_templates (name, slug, subject, html_content, is_active)
VALUES (
  'Feature Update',
  'feature-update',
  'New in FIBI: [Feature Name]',
  '<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head><body style="margin:0;padding:24px;font-family:-apple-system,BlinkMacSystemFont,''Segoe UI'',Roboto,sans-serif;line-height:1.6;color:#171717;">
<h2>New in FIBI</h2>
<p>We''ve just added something new:</p>
<p><strong>[Short feature explanation]</strong></p>
<p>
  <a href="https://fibi.world/login" style="display:inline-block;padding:14px 26px;background:#3b82f6;color:#ffffff;text-decoration:none;border-radius:999px;">Try it</a>
</p>
</body></html>',
  false
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  subject = EXCLUDED.subject,
  html_content = EXCLUDED.html_content,
  updated_at = now();

INSERT INTO public.email_automations (name, template_slug, trigger_type, conditions, delay_hours, is_active)
SELECT 'Feature Update', 'feature-update', 'manual', '{}'::jsonb, 0, false
WHERE NOT EXISTS (SELECT 1 FROM public.email_automations WHERE template_slug = 'feature-update');
