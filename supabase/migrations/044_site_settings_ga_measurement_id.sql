-- SEO & Analytics: GA measurement ID (managed in admin). Empty = analytics disabled.
INSERT INTO public.site_settings (key, value) VALUES ('ga_measurement_id', '')
ON CONFLICT (key) DO NOTHING;
