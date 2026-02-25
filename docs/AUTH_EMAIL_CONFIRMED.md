# Email “confirmed” in auth: two concepts

Confirmation is **not a login barrier**. Users can sign in as soon as they have an account. The confirm link only updates the in-app banner and `profiles.email_verified_at`; a barrier can be added later if you want to restrict unconfirmed users.

| Concept | Where it lives | Where it’s set | Used for |
|--------|----------------|----------------|----------|
| **Supabase** `auth.users.email_confirmed_at` | Supabase Auth | Signup creates users with `email_confirm: true`; confirm-email link also sets it via admin API | Not a login gate. Referenced in resend-confirm-email and admin/email automations. |
| **App** `profiles.email_verified_at` | `profiles` table | Set when the user clicks the app’s “confirm your email” link (Resend email → `GET /api/confirm-email?token=...`) | In-app “confirmed” banner, resend logic, email automations. |

**Where each is used in code**

- **`profiles.email_verified_at`**  
  - Set: `src/app/api/confirm-email/route.ts` (after token verify).  
  - Read: HomeGrid (banner), resend-confirm-email (“already confirmed”), email automations, admin views.

- **`auth.users.email_confirmed_at`**  
  - Set: signup uses `email_confirm: true`; confirm-email route calls `auth.admin.updateUserById(..., { email_confirm: true })`.  
  - Read: `src/app/api/auth/resend-confirm-email/route.ts`, admin APIs, `supabase/migrations/030_admin_email_verified_at.sql` (COALESCE with `profiles.email_verified_at` for admin “confirmed” view).

**Single “confirmed” for admin/automations**

- Migration `030_admin_email_verified_at.sql` defines a view that uses `COALESCE(profiles.email_verified_at, auth.users.email_confirmed_at)` so admin and automations can treat a user as confirmed if either source is set.

**No login barrier**

- New signups are created with `email_confirm: true` so they can log in immediately. The confirm email link is optional and only updates the banner and `profiles.email_verified_at`. To avoid any Supabase-level login requirement for existing users, set **Confirm email** to OFF in Supabase Dashboard → Authentication → Providers → Email.
