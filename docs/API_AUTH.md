# API route authorization

This document lists each API route’s **intended audience** and how auth is enforced. Use it to verify that no route is over- or under-protected.

## Protected routes (middleware)

Paths under `/app`, `/add`, `/item`, `/profile` are protected by `middleware.ts`: unauthenticated users are redirected to `/login`. That includes `/app/calendar`, `/app/map`, `/app/how-to` (they match `/app/:path*`).

---

## API routes by audience

### Public (no auth)

| Route | Purpose | Notes |
|-------|---------|--------|
| `GET/POST /api/auth/signout` | Sign out | Clears session; redirect to login |
| `POST /api/auth/signup` | Create account | Rate limit + optional Turnstile; uses service role |
| `GET /api/auth/callback` | OAuth/magic-link callback | Query `code` from Supabase Auth |
| `GET /api/confirm-email` | Verify email token | Token in query; uses service role to set `email_verified_at` |
| `POST /api/auth/resend-confirm-email` | Resend confirmation email | Rate limited; session or body `email` |
| `POST /api/metadata` | Fetch URL metadata | Body: `url`. Uses SSRF protection (`isUrlSafeForFetch`) |
| `GET/POST /api/oembed` | oEmbed for link previews | URL param/body. Uses SSRF protection |
| `GET /api/image-proxy` | Proxy images from allowed CDNs | Query `url`. Allowlist + `isUrlSafeForFetch` before redirect |
| `GET /api/manifest` | PWA manifest | Public |
| `GET /api/version` | App version | Public |

### Authenticated (cookie or Bearer)

| Route | Purpose | Auth |
|-------|---------|------|
| `POST /api/places` | Google Places | `requireUser` |
| `POST /api/ai-enrich` | AI title/description | `requireUser` |
| `GET /api/calendar/download` | Export calendar | Cookie or `Authorization: Bearer <access_token>` |
| `POST /api/itinerary/invite` | Invite collaborator | Cookie or Bearer |
| `POST /api/itinerary/share` | Create share | Cookie or Bearer |
| `GET/DELETE /api/itinerary/share/[token]` | Get or revoke share | Token in path; ownership/collaborator checked |
| `POST /api/itinerary/share/[token]/join-collaborator` | Join as collaborator | Token in path/body; optional cookie/Bearer |
| `POST /api/itinerary/share/[token]/add-to-account` | Add shared itinerary to account | `requireUser` (cookie or Bearer) |
| `GET/POST /api/itinerary/[id]/comments` | List/add comments | Cookie or Bearer; shared access via RPC |

### Admin only

| Route | Purpose | Auth |
|-------|---------|------|
| `GET/PATCH /api/admin/site-settings` | Site settings | `requireAdmin` |
| `GET /api/admin/users` | List users | `requireAdmin` |
| `POST /api/admin/send-welcome` | Send welcome email | `requireAdmin` |
| `POST /api/admin/send-onboarding-nudge` | Send onboarding nudge | `requireAdmin` |
| `GET/POST /api/admin/founding-followup` | Founding follow-up | `requireAdmin` |
| `GET/POST /api/admin/emails/templates` | Email templates | `requireAdmin` |
| `GET/PATCH /api/admin/emails/templates/[slug]` | Single template | `requireAdmin` |
| `POST /api/admin/emails/templates/[slug]/send-test` | Send test email | `requireAdmin` |
| `GET/POST /api/admin/emails/automations` | Email automations | `requireAdmin` |
| `PATCH /api/admin/emails/automations/[id]` | Update automation | `requireAdmin` |
| `POST /api/admin/emails/automations/[id]/run` | Run automation | `requireAdmin` |
| `POST /api/admin/emails/run-automations` | Run all automations | `requireAdmin` |
| `POST /api/email/send` | Send email (admin) | `requireAdmin` |
| `POST /api/email` | Email (admin) | `requireAdmin` |

### Cron

| Route | Purpose | Auth |
|-------|---------|------|
| `GET /api/cron/email-automations` | Daily email automations | `Authorization: Bearer <CRON_KEY>` or `<CRON_SECRET>`. See `isCronAuthorized` in `src/lib/run-email-automations.ts`. Set `CRON_KEY` and/or `CRON_SECRET` in Vercel (min 16 chars). |

---

## Security notes

- **SSRF**: `metadata` and `oembed` use `isUrlSafeForFetch(url)` before fetching. `image-proxy` uses an allowlist for proxy fetch and `isUrlSafeForFetch` before redirecting the client for non-allowed hosts.
- **Admin**: Role is read from `profiles.role`. A trigger `enforce_profiles_role_immutable` prevents changing `role` via any UPDATE (migration `039_prevent_profiles_role_escalation.sql`). The first admin must be set via Supabase Dashboard or a migration. No API allows a normal user to set or update `profiles.role`.
- **Service role**: Used only after `requireAdmin()` in admin routes, or in signup/confirm-email flows that are rate-limited and validated.
