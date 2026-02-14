# Creating your profile and logging in

## 1. Create your account (sign up)

1. Open the app and go to **Sign up**:  
   [Your site URL]/signup (e.g. `http://localhost:3000/signup` or `https://fibi.world/signup`).

2. Enter your **email** and a **password** (at least 6 characters), then confirm the password.

3. Click **Sign up**.

4. Supabase will send a **confirmation email**. Open it and click the confirmation link.

5. After confirming, you have an account. A **profile** is created automatically (by a database trigger) when you sign up.

---

## 2. Log in

1. Go to **Login**:  
   [Your site URL]/login (e.g. `http://localhost:3000/login` or `https://fibi.world/login`).

2. Enter the same **email** and **password** you used to sign up.

3. Click **Sign in**. You’ll be redirected to the app (`/app`).

---

## 3. Make yourself an admin (optional)

To use the **Admin dashboard** at `/admin`, your profile must have `role = 'admin'`.

1. In the [Supabase Dashboard](https://supabase.com/dashboard), open your project.

2. Go to **SQL Editor** and run (replace with your email):

```sql
-- Replace 'your@email.com' with the email you used to sign up
UPDATE public.profiles
SET role = 'admin'
WHERE id = (SELECT id FROM auth.users WHERE email = 'your@email.com');
```

3. Log in again (or refresh) and go to `/admin`. You should see the admin dashboard.

---

## Run the profiles migration (if you haven’t yet)

The app expects a `profiles` table with a `role` column. If it doesn’t exist yet:

1. In Supabase: **SQL Editor** → **New query**.
2. Copy the contents of `supabase/migrations/013_create_profiles.sql` and run it.

Or, if you use the Supabase CLI:

```bash
supabase db push
```

After that, new signups will get a profile automatically, and you can set your own role to `admin` with the SQL above.
