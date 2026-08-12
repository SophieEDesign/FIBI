-- Track which public travel guide drove a signup (traffic attribution).
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS signup_guide_id UUID REFERENCES public.travel_guides(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS signup_guide_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_profiles_signup_guide_id ON public.profiles(signup_guide_id);
CREATE INDEX IF NOT EXISTS idx_profiles_signup_guide_at ON public.profiles(signup_guide_at);
