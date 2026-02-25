# Environment variables

Required and optional environment variables by context. Never commit secrets; use Vercel (or your host) environment settings and local `.env.local` for development.

## All contexts (dev, preview, production)

| Variable | Required | Notes |
|----------|----------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL. Safe to expose (client). |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anon key. Safe to expose (client). |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Server-only. Used for admin APIs, signup, confirm-email, cron, email automations. |
| `NEXT_PUBLIC_SITE_URL` | Recommended | Canonical app URL (e.g. `https://fibi.world`). Used for redirects, links, OAuth. |
| `VERCEL_URL` | Set by Vercel | Used as fallback when `NEXT_PUBLIC_SITE_URL` is unset (preview and prod). |

## Development

- Same as above. Use `.env.local` with `NEXT_PUBLIC_SITE_URL=http://localhost:3000` (or leave unset).

## Preview (Vercel preview deployments)

- Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` in Vercel if sign-out or auth redirects depend on them (see [VERCEL_PREVIEW_401.md](VERCEL_PREVIEW_401.md)).
- Optional: `NEXT_PUBLIC_SITE_URL` for the preview URL if you need correct links in emails.

## Production

| Variable | Required | Notes |
|----------|----------|--------|
| `RESEND_API_KEY` | Yes (if sending email) | Resend.com API key for transactional and automation emails. |
| `CONFIRM_EMAIL_SECRET` | Yes | Secret for email verification token signing (confirm-email flow). |
| `EMAIL_FOOTER_ADDRESS` | Optional | CAN-SPAM footer; can also be set in Admin → Site settings. |
| `OPENAI_API_KEY` or `ANTHROPIC_API_KEY` | Optional | For AI enrichment (title/description). At least one enables the feature. |
| `GOOGLE_PLACES_API_KEY` | Optional | For Places autocomplete and details (server). |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | Optional | For map display (client). |
| `TURNSTILE_SECRET_KEY` | Optional | Cloudflare Turnstile (signup). |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Optional | Turnstile site key (client). |
| `FACEBOOK_ACCESS_TOKEN` / `INSTAGRAM_ACCESS_TOKEN` | Optional | For oEmbed/metadata on Meta URLs when approved. |

## Cron (email automations)

Used by `GET /api/cron/email-automations` (Vercel Cron or external scheduler).

| Variable | Required | Notes |
|----------|----------|--------|
| `CRON_KEY` or `CRON_SECRET` | Yes | Bearer token for cron auth; min 16 characters. Set the same value in Vercel Cron’s “CRON_SECRET” if using Vercel Cron. |

## Security

- **Never** use `NEXT_PUBLIC_` for: `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`, `CONFIRM_EMAIL_SECRET`, `CRON_KEY`, `CRON_SECRET`, `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `GOOGLE_PLACES_API_KEY`, `TURNSTILE_SECRET_KEY`, or any Meta tokens. Those must be server-only.
- Client-safe (may be `NEXT_PUBLIC_`): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`, `NEXT_PUBLIC_TURNSTILE_SITE_KEY`.
