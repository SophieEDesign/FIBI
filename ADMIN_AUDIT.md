# Admin Area Audit Report

**Date:** August 2026  
**Scope:** Admin pages, APIs, auth, docs, tab usefulness  
**Status:** Findings documented; Fix-now doc patches applied in the same pass

---

## Verdict

Admin is **secure enough for a small trusted-operator setup**: every `/api/admin/*` route (and `/api/email*`) calls `requireAdmin` before using the service role; `profiles.role` cannot be escalated via the app. Gaps are mainly **docs drift**, **inconsistent client auth headers**, **no action/abuse review UI**, and a few **high-power unused endpoints**.

**Overall health:** Good  
**Production readiness (admin):** Ready for internal use; polish docs and auth-header consistency next

---

## What's working

- Shared gate in [`src/lib/admin.ts`](src/lib/admin.ts): cookie or Bearer token, then `profiles.role === 'admin'`
- Role immutability trigger [`039_prevent_profiles_role_escalation.sql`](supabase/migrations/039_prevent_profiles_role_escalation.sql)
- All 19 files under `src/app/api/admin/**` call `requireAdmin(request)` before `getAdminSupabase()`
- Page shells check role client-side and redirect non-admins to `/app` (UX only; APIs enforce)
- `/admin` redirects to `/app/admin` (inside protected middleware)
- Email log + click tracking is a solid audit-style read path
- Guides CRUD is admin-gated with sensible validation (slug clash, status enum)
- Site settings PATCH only upserts allowlisted keys (`email_footer_address`, `ga_measurement_id`)
- Cron email path uses `isCronAuthorized`, separate from admin UI

---

## Tab usefulness

| Area | Keep? | Notes |
|------|--------|--------|
| Users + funnel + insights | Yes | Core ops + activation view |
| SEO & Analytics (GA ID) | Yes | Needed for cookie-gated GA |
| Email footer address | Yes | CAN-SPAM |
| Run automations panel | Yes | Manual override next to cron |
| Email Templates | Yes | Edit + one-off send + recipient preview |
| Automations | Yes | Lifecycle config |
| Email log | Yes | Closest product “audit” surface |
| Travel Guides | Yes | Editorial / SEO acquisition |
| Founding follow-up API | Low | Implemented but **no UI** — covered by automations / one-off |
| `POST /api/email` raw send | Caution | Arbitrary HTML to any address; admin-only; no in-app caller |
| `POST /api/email/send` typed send | Low | Duplicate of send-welcome / nudge paths; **no UI caller** |
| Signup attempt logs | Missing UI | Table exists for abuse review; write-only from app |

---

## Fix now

### 1. Docs: admin API table incomplete
**Issue:** [`docs/API_AUTH.md`](docs/API_AUTH.md) omitted email log, recipients, automation-status, guides, send-one-off.  
**Impact:** Auth review / onboarding miss real admin surface.  
**Fix:** Sync admin route table (applied this pass).

### 2. Docs: ADMIN_SETUP path
**Issue:** Setup doc only said dashboard at `/admin`. That works via redirect, but real UI is `/app/admin`.  
**Impact:** Mild confusion.  
**Fix:** Clarify both paths (applied this pass).

### 3. Docs: service-role usage overstated
**Issue:** API_AUTH said service role is only after `requireAdmin` or signup/confirm. Also used by cron, Resend webhook, public `GET /api/site-meta` (GA id only).  
**Impact:** Misleading security mental model.  
**Fix:** Correct the note (applied this pass).

---

## Fix soon

### 1. Stale Bearer tokens on email admin clients
**Issue:** [`EmailLogClient.tsx`](src/components/EmailLogClient.tsx), [`EmailTemplatesClient.tsx`](src/components/EmailTemplatesClient.tsx), [`EmailAutomationsClient.tsx`](src/components/EmailAutomationsClient.tsx) call `getSession()` only. [`AdminDashboard.tsx`](src/components/AdminDashboard.tsx) correctly prefers `getUser()` first to refresh.  
**Impact:** Intermittent 401s on live/preview (already hinted in Users error copy).  
**Fix:** Share one `getAdminAuthHeaders()` helper that mirrors AdminDashboard.

### 2. 500 responses leak `err.message` on several admin routes
**Issue:** e.g. `send-welcome`, `send-onboarding-nudge`, `send-one-off`, `founding-followup`, `automations/[id]/run`, `templates/.../send-test`, `/api/email/send` return exception messages. Docs ask for generic 500 bodies.  
**Impact:** Low for non-admins (gated); still noisy and can expose internals to a compromised admin session.  
**Fix:** Log full error; return `{ error: 'Internal server error' }`.

### 3. Incomplete / inconsistent admin nav
**Issue:** Guides page only links Users + Guides; Templates page is partial; Users has full set.  
**Impact:** Easy to lose your place.  
**Fix:** Shared `AdminNav` component with current-route highlight.

### 4. Duplicated admin gate boilerplate
**Issue:** Same client role-check + redirect copied across ~6 pages.  
**Impact:** Drift risk (already different redirect query strings).  
**Fix:** `useRequireAdmin()` hook or small layout wrapper under `/app/admin`.

### 5. High-power / unused email endpoints
**Issue:** `POST /api/email` sends arbitrary HTML; `POST /api/email/send` and `GET/POST /api/admin/founding-followup` have no UI callers (founding is via automations).  
**Impact:** Larger attack surface if an admin session is stolen; dead code confusion.  
**Fix:** Prefer automations/templates paths; deprecate or remove unused routes, or wire founding into UI if still needed.

### 6. No confirmation on destructive / bulk actions
**Issue:** Guide delete, one-off mass send, run-all automations have little/no confirm step.  
**Impact:** Accidental sends or deletes.  
**Fix:** Simple confirm dialogs before delete / bulk send.

### 7. Users list scales poorly
**Issue:** [`users/route.ts`](src/app/api/admin/users/route.ts) pages through all Auth users (1000/page) and builds funnel in memory.  
**Impact:** Slow as user count grows.  
**Fix:** Paginate UI; push aggregates into SQL/views (partially started with `admin_activation_stats`).

### 8. `signup_attempt_logs` has no admin UI
**Issue:** Written by [`signupProtection.ts`](src/lib/signupProtection.ts) for abuse review; only readable via SQL.  
**Impact:** Harder to investigate signup blocks.  
**Fix:** Optional `/app/admin/signup-log` read API + simple table (mirror email log).

---

## Fix later

- **Admin action audit trail** — who published a guide, changed GA, ran automations, sent one-offs (no `admin_audit_logs` table today)
- **Server-side admin layout** — middleware only checks “logged in”, not `role === 'admin'`; fine while APIs enforce, but shell HTML still loads for non-admins before client redirect
- **GA measurement ID validation** — accept blank or `G-…` pattern only
- **Brand voice** — admin copy is utilitarian (“Failed to load”, “Access denied”); fine for internal tools; soft polish if desired
- **Item edit versioning** — already noted in [`SYSTEM_AUDIT.md`](SYSTEM_AUDIT.md); out of scope here

---

## Auth architecture (reference)

```
Browser (/app/admin/*)
  → middleware: must be logged in
  → client: profiles.role === 'admin' or redirect /app
  → fetch APIs with Bearer (preferred) + cookies
       → requireAdmin(request)
       → getAdminSupabase() (service role)
```

Public service-role reads (not admin):
- `GET /api/site-meta` — GA measurement ID only
- Resend webhook / cron — secret or signature gated

---

## Checklist after this pass

- [x] requireAdmin on all `/api/admin/*`
- [x] Role escalation blocked in DB
- [x] ADMIN_AUDIT.md written
- [x] API_AUTH.md + ADMIN_SETUP.md updated (Fix now)
- [ ] Shared admin auth headers + nav (Fix soon)
- [ ] Generic 500 bodies on admin email routes (Fix soon)
- [ ] Signup attempt review UI (Fix soon / later)
