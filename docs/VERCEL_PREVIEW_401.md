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

## Resend confirmation email

- **`POST /api/auth/resend-confirm-email`** – Works with or without a session. The app sends the session user when authenticated; when not (e.g. cookie blocked on preview), send the body `{ "email": "your@email.com" }` and the server will look up the user and send the confirmation email if the address is unverified. The UI already sends `email` in the body.

## Preview images (403 on Facebook/Instagram)

- **403 on `fbcdn.net` / `cdninstagram.com`** – Meta often blocks direct image loads. The app now:
  - Uses **`/api/image-proxy?url=...`** for thumbnail/preview images from those hosts (LinkPreview, CalendarView, SharedItineraryView, PlaceDetailDrawer, EmbedPreview).
  - Uses a **browser-like User-Agent** when the proxy fetches from Meta so more requests succeed.
- If you still see broken preview images on a **Vercel preview** URL, the image-proxy request may be getting **401** from Vercel Deployment Protection. Disable protection for previews (see above) so the proxy (and manifest/oembed/metadata) return 200.
