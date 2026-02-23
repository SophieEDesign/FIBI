# Supabase security lints – what we fixed and what’s manual

This doc tracks Supabase Performance/Security Advisor findings and how they’re addressed.

## Fixed in code (migrations)

### Function Search Path Mutable (0011)

- **What it is:** Functions without an explicit `search_path` can be affected by the caller’s search path (security risk).
- **What we did:** Migration `034_fix_function_search_path.sql` redefines these functions with `SET search_path = ''` and schema-qualified names where needed:
  - `public.handle_new_user`
  - `public.update_email_templates_updated_at`
  - `public.update_updated_at_column`
- **Ref:** [Database Linter – function search path](https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable)

---

## Manual (Supabase Dashboard)

### Leaked Password Protection Disabled

- **What it is:** Supabase Auth can check passwords against HaveIBeenPwned.org to block known-compromised passwords. The Security Advisor warns when this is off.
- **What to do:** Enable it in the dashboard (cannot be fixed in repo):
  1. [Supabase Dashboard](https://supabase.com/dashboard) → your project.
  2. **Authentication** → **Providers** → **Email** (or **Auth** → **Settings** depending on UI).
  3. Turn on **“Leaked password protection”** / **“Check passwords against HaveIBeenPwned”**.
- **Ref:** [Password strength and leaked password protection](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection)
