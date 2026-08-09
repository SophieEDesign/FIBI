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
| `GET /api/site-meta` | Site meta (GA measurement ID) | Public; service role read of one allowlisted setting |

### Authenticated (cookie or Bearer)

| Route | Purpose | Auth |
|-------|---------|------|
| `POST /api/places` | Google Places | `requireUser` |
| `POST /api/ai-enrich` | AI title/description | `requireUser` |
| `POST /api/persist-thumbnail` | Rehost preview image into Storage | Cookie or Bearer; owns the `saved_items` row |
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
| `GET/PATCH /api/admin/site-settings` | Site settings (email footer, GA id) | `requireAdmin` |
| `GET /api/admin/users` | List users, funnel, insights | `requireAdmin` |
| `POST /api/admin/send-welcome` | Send welcome email | `requireAdmin` |
| `POST /api/admin/send-onboarding-nudge` | Send onboarding nudge | `requireAdmin` |
| `GET/POST /api/admin/founding-followup` | Founding follow-up (eligible list / bulk send) | `requireAdmin` |
| `GET/POST /api/admin/emails/templates` | Email templates | `requireAdmin` |
| `GET/PATCH /api/admin/emails/templates/[slug]` | Single template | `requireAdmin` |
| `POST /api/admin/emails/templates/[slug]/send-test` | Send test email | `requireAdmin` |
| `GET/POST /api/admin/emails/segments` | Named audience segments | `requireAdmin` |
| `GET/PATCH/DELETE /api/admin/emails/segments/[id]` | Single segment | `requireAdmin` |
| `GET/POST /api/admin/emails/campaigns` | Marketing campaigns | `requireAdmin` |
| `GET/PATCH/DELETE /api/admin/emails/campaigns/[id]` | Single campaign | `requireAdmin` |
| `POST /api/admin/emails/campaigns/[id]/send` | Send campaign now | `requireAdmin` |
| `GET/POST /api/admin/emails/automations` | Email automations | `requireAdmin` |
| `PATCH /api/admin/emails/automations/[id]` | Update automation | `requireAdmin` |
| `POST /api/admin/emails/automations/[id]/run` | Run one automation | `requireAdmin` |
| `POST /api/admin/emails/run-automations` | Run all automations | `requireAdmin` |
| `GET /api/admin/emails/automation-status` | Last automation run status | `requireAdmin` |
| `POST /api/admin/emails/send-one-off` | One-off send by template + filters | `requireAdmin` |
| `GET /api/admin/emails/recipients` | Recipient count/sample for filters | `requireAdmin` |
| `GET /api/admin/emails/log` | Sent email log + engagement rates | `requireAdmin` |
| `POST /api/unsubscribe` | One-click / form marketing unsubscribe | Public (signed token) |
| `GET/PATCH /api/email-preferences` | Logged-in marketing opt-in toggle | Auth session |
| `GET/POST /api/admin/guides` | List / create travel guides | `requireAdmin` |
| `GET/PATCH/DELETE /api/admin/guides/[id]` | Guide CRUD | `requireAdmin` |
| `PUT /api/admin/guides/[id]/places` | Replace guide places | `requireAdmin` |
| `POST /api/email/send` | Typed welcome/nudge/founding send | `requireAdmin` |
| `POST /api/email` | Raw Resend send (to/subject/html) | `requireAdmin` |

### Cron

| Route | Purpose | Auth |
|-------|---------|------|
| `GET /api/cron/email-automations` | Daily email automations | `Authorization: Bearer <CRON_KEY>` or `<CRON_SECRET>`. See `isCronAuthorized` in `src/lib/run-email-automations.ts`. Set `CRON_KEY` and/or `CRON_SECRET` in Vercel (min 16 chars). |

---

## Security notes

- **SSRF**: `metadata`, `oembed`, and `persist-thumbnail` use `isUrlSafeForFetch(url)` before fetching. `image-proxy` uses an allowlist for proxy fetch and `isUrlSafeForFetch` before redirecting the client for non-allowed hosts.
- **Admin**: Role is read from `profiles.role`. A trigger `enforce_profiles_role_immutable` prevents changing `role` via any UPDATE (migration `039_prevent_profiles_role_escalation.sql`). The first admin must be set via Supabase Dashboard or a migration. No API allows a normal user to set or update `profiles.role`.
- **Service role**: Used after `requireAdmin()` in admin routes; in signup/confirm-email/resend flows that are rate-limited and validated; in cron (`isCronAuthorized`) and the Resend webhook; and on public `GET /api/site-meta` (reads GA measurement ID only).

### Error responses

- 500 responses should return a generic `{ error: 'Internal server error' }` (or similar) so internal details or stack traces are not leaked. Log the real error server-side with `console.error`.
