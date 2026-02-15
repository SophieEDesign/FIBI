# 401 errors on Vercel preview deployments

If you see **401 (Unauthorized)** on your Vercel **preview** URL (e.g. `fibi-xxxxx-sophies-projects-17b0f294.vercel.app`) for:

- `/api/manifest`
- `/api/oembed`
- `/api/metadata`
- or any other path

the response is coming from **Vercel Deployment Protection**, not from the FiBi app. Protection runs before the request reaches Next.js, so the app never gets a chance to respond.

## Fix

1. Open your project on [Vercel](https://vercel.com): **Project → Settings**.
2. Go to **Deployment Protection**.
3. Either:
   - **Disable protection for Preview deployments** (e.g. turn off “Vercel Authentication” or “Password Protection” for Previews), or  
   - **Add an exception** so that your preview domain (or the specific deployment URL) is not protected.

After that, the same preview URL will return 200 for `/api/manifest`, `/api/oembed`, and `/api/metadata` (and the rest of the app will be reachable without the protection prompt).

## Other 401s

- **`POST /api/auth/resend-confirm-email` 401** – This route requires an authenticated user. If the user is not logged in (or their session isn’t valid on the preview domain), 401 is expected. No code change needed.

- **403 on Facebook/Instagram image URLs** (`fbcdn.net`, `cdninstagram.com`) – Those are returned by Meta’s servers when they block hotlinking or non-browser requests. They are unrelated to Vercel or FiBi auth.
