# Email “confirmed” in auth: two concepts

The app uses two different “email confirmed” notions. Both are used; neither blocks sign-in (signup uses `email_confirm: false`).

| Concept | Where it lives | Where it’s set | Used for |
|--------|----------------|----------------|----------|
| **Supabase** `auth.users.email_confirmed_at` | Supabase Auth | Set by Supabase (e.g. magic link, or if you enabled email confirm on signup) | Not used as a sign-up gate. Referenced in resend-confirm-email and admin/email automations. |
| **App** `profiles.email_verified_at` | `profiles` table | Set when the user clicks the app’s “confirm your email” link (Resend email → `GET /api/confirm-email?token=...`) | In-app “confirmed” banner, resend logic, email automations. |

**Where each is used in code**

- **`profiles.email_verified_at`**  
  - Set: `src/app/api/confirm-email/route.ts` (after token verify).  
  - Read: HomeGrid (banner), resend-confirm-email (“already confirmed”), email automations, admin views.

- **`auth.users.email_confirmed_at`**  
  - Set: by Supabase only (we do not set it in app code).  
  - Read: `src/app/api/auth/resend-confirm-email/route.ts`, admin APIs, `supabase/migrations/030_admin_email_verified_at.sql` (COALESCE with `profiles.email_verified_at` for admin “confirmed” view).

**Single “confirmed” for admin/automations**

- Migration `030_admin_email_verified_at.sql` defines a view that uses `COALESCE(profiles.email_verified_at, auth.users.email_confirmed_at)` so admin and automations can treat a user as confirmed if either source is set.
