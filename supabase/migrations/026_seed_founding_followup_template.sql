-- Seed founding-followup template (personal email from Sophie asking what made them sign up)
INSERT INTO public.email_templates (name, slug, subject, html_content, is_active)
VALUES (
  'Founding Follow-Up',
  'founding-followup',
  'You joined FIBI recently — can I ask you something?',
  '<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Quick question</title></head><body style="margin:0;padding:24px;font-family:-apple-system,BlinkMacSystemFont,''Segoe UI'',Roboto,sans-serif;line-height:1.6;color:#171717;">
<h2>Quick question</h2>
<p>I noticed you joined FIBI recently — thank you.</p>
<p>I''m still shaping the product and would genuinely love to know:</p>
<p><strong>What made you sign up?</strong></p>
<p>Was there something specific that frustrates you about planning trips?</p>
<p>You can just reply to this email — I read every response.</p>
<p>– Sophie</p>
</body></html>',
  false
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  subject = EXCLUDED.subject,
  html_content = EXCLUDED.html_content,
  updated_at = now();

-- Seed automation for founding follow-up (confirmed users who have not received it)
INSERT INTO public.email_automations (name, template_slug, trigger_type, conditions, delay_hours, is_active)
SELECT
  'Founding Follow-Up',
  'founding-followup',
  'user_confirmed',
  '{"confirmed": true, "founding_followup_sent": false}'::jsonb,
  0,
  false
WHERE NOT EXISTS (
  SELECT 1 FROM public.email_automations WHERE template_slug = 'founding-followup'
);
