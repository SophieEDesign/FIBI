# 401 errors on Vercel preview deployments

If you see **401 (Unauthorized)** on your Vercel **preview** URL (e.g. `fibi-xxxxx-sophies-projects-17b0f294.vercel.app`) for:

- `/api/manifest`
- `/api/oembed`
- `/api/metadata`
- `/api/admin/users` (Admin page: "Could not load user data (401)")
- or any other path

the response is coming from **Vercel Deployment Protection**, not from the FiBi app. Protection runs before the request reaches Next.js, so the app never gets a chance to respond.

## Fix

1. Open your project on [Vercel](https://vercel.com): **Project → Settings**.
2. Go to **Deployment Protection**.
3. Either:
   - **Disable protection for Preview deployments** (e.g. turn off “Vercel Authentication” or “Password Protection” for Previews), or  
   - **Add an exception** so that your preview domain (or the specific deployment URL) is not protected.

After that, the same preview URL will return 200 for `/api/manifest`, `/api/oembed`, `/api/metadata`, the Admin page, and the rest of the app (no protection prompt).

### Admin page specifically

If you see **"Could not load user data (401)"** on the **Admin** page:

- **On a preview URL:** The request to `/api/admin/users` is likely blocked by Vercel Deployment Protection. Add the preview URL to **Deployment Protection Exceptions** (or disable protection for Previews), or use the production site for admin.
- **On the live/production site:** Usually a session issue: the token may be expired or not sent. Try **signing out and back in**. The app uses a refreshed session for the admin API; if it still fails, check the browser console and that cookies for your domain are allowed.

## Resend confirmation email

- **`POST /api/auth/resend-confirm-email`** – Works with or without a session. The app sends the session user when authenticated; when not (e.g. cookie blocked on preview), send the body `{ "email": "your@email.com" }` and the server will look up the user and send the confirmation email if the address is unverified. The UI already sends `email` in the body.

## Preview images (403 on Facebook/Instagram)

- **403 on `fbcdn.net` / `cdninstagram.com`** – Meta often blocks direct image loads. The app now:
  - Uses **`/api/image-proxy?url=...`** for thumbnail/preview images from those hosts (LinkPreview, CalendarView, SharedItineraryView, PlaceDetailDrawer, EmbedPreview).
  - Uses a **browser-like User-Agent** when the proxy fetches from Meta so more requests succeed.
  - **No fallback to raw URL** for those hosts when the proxy fails (fallback would get 403); the placeholder is shown instead.
- If you still see broken preview images on a **Vercel preview** URL, the image-proxy request may be getting **401** from Vercel Deployment Protection. Disable protection for previews (see above) so the proxy (and manifest/oembed/metadata) return 200.

## Comments API (401)

- **GET `/api/itinerary/[id]/comments`** requires either a logged-in user (owner/collaborator) or a valid **`share_token`** query param (for shared itinerary view). When viewing a shared itinerary, pass `?share_token=...` to load comments without auth.
- If you see 401 while logged in on the calendar, session cookies may not have been sent on the first request; the client retries once. On Vercel preview, Deployment Protection can also cause 401 before the request reaches the app.

## Not receiving emails

Emails can fail for a few different reasons.

### 1. Vercel preview: 401 blocks the email API

If you’re on a **preview** URL and you use “Resend confirmation” (or any endpoint that sends email), the request may hit **Vercel Deployment Protection** first and get **401** before it reaches the app. The app never runs, so no email is sent.

- **Fix:** Disable Deployment Protection for Preview deployments (see [Fix](#fix) above), or test email flows on **production** (or locally).
- **UX:** The app now shows a message when Resend gets 401: *“If you’re on a preview or staging link, try the live site (fibi.world) to resend…”*

### 2. Resend API key not set on Vercel

The app sends confirmation and other emails via **Resend**. If `RESEND_API_KEY` is not set in your **Vercel** project, those sends will fail (500) and you won’t get emails.

- **Fix:** In Vercel: **Project → Settings → Environment Variables**. Add `RESEND_API_KEY` with your key from [Resend API Keys](https://resend.com/api-keys), for the environments where you need email (Production and/or Preview).

### 3. Supabase auth emails (signup, password reset)

**Signup confirmation** and **password reset** emails are sent by **Supabase**, not by the Next.js app. If Supabase SMTP isn’t configured, those emails never go out.

- **Fix:** Configure Supabase to use Resend SMTP. See **[RESEND_SUPABASE_SETUP.md](../RESEND_SUPABASE_SETUP.md)** in the repo: Supabase Dashboard → Authentication → SMTP Settings, use `smtp.resend.com`, username `resend`, password = your Resend API key. Sender must be from a domain verified in Resend (e.g. `hello@fibi.world` or `onboarding@onboarding.resend.dev` for testing).

### Quick checklist

- [ ] **Preview 401:** Deployment Protection disabled for Previews, or testing on production.
- [ ] **RESEND_API_KEY** set in Vercel (and in `.env.local` for local dev).
- [ ] **Supabase SMTP** configured with Resend (for signup/password-reset emails).
- [ ] **Resend domain:** Sender address (`hello@fibi.world` or test domain) is verified in Resend.
