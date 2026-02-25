# Deployment checklist

Use this when deploying to Vercel (or similar) for production or preview.

## Environment variables

- See [ENV.md](ENV.md) for the full list by context.
- **Production:** Set all required vars in Vercel → Project → Settings → Environment Variables. Include at least:
  - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
  - `NEXT_PUBLIC_SITE_URL` (e.g. `https://fibi.world`)
  - `RESEND_API_KEY`, `CONFIRM_EMAIL_SECRET` if using email
- **Preview:** Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` so auth (including sign-out) works. See [VERCEL_PREVIEW_401.md](VERCEL_PREVIEW_401.md) if you use Deployment Protection.

## Cron (email automations)

If you use the daily email automations:

1. Set `CRON_KEY` (and optionally `CRON_SECRET`) in Vercel. Use the same value in both if using Vercel Cron.
2. In Vercel → Project → Settings → Cron Jobs, add a job that calls `GET /api/cron/email-automations` on the desired schedule (e.g. daily). Configure the request to send `Authorization: Bearer <CRON_KEY>` (Vercel can use `CRON_SECRET` for this when set).

## Post-deploy

- Run Supabase migrations if any are new (SQL Editor or `supabase db push`).
- In Supabase Dashboard, enable **Leaked password protection** under Authentication if not already (see [SUPABASE_SECURITY_LINTS.md](SUPABASE_SECURITY_LINTS.md)).
- Confirm the first admin user is set via Dashboard or a one-off SQL update (app does not allow self-service role change).
