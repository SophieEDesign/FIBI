# Console messages – what they mean

## Manifest 401 (PWA install fails)

- **What:** The PWA manifest request returns 401, so "Add to Home Screen" / install can fail.
- **In the app:** The manifest is served from **`/api/manifest`** with no auth. The 401 is **not** from our app — it comes from **Vercel Deployment Protection** before the request reaches our code. You cannot fix this in the app; you must change a Vercel setting.

### Fix: Turn off Deployment Protection for this project

1. Open **Vercel Dashboard** (vercel.com) → your **FIBI** project.
2. Go to **Settings** → **Deployment Protection** (or **Security** → **Deployment Protection**).
3. Under **Vercel Authentication** or **Password Protection**: set to **Disabled** for this project (or add a **Deployment Protection Exception** for your production domain if your plan supports it, e.g. Pro + Advanced).
4. Save. Redeploy if needed.
5. In an **incognito** window open: `https://your-production-url.vercel.app/api/manifest` — you should get **200** and JSON. Then PWA install will work.

---

## Supabase token 400

- **What:** `supabase.co/auth/v1/token?grant_type=password` returns 400.
- **Meaning:** Usually wrong email/password or a temporary auth error (e.g. "Invalid login credentials").
- **Action:** Only a problem if you can't log in. If login works, you can ignore it (e.g. from an old tab or a failed attempt).

---

## Facebook/Instagram image 403

- **What:** Requests to `scontent-*.xx.fbcdn.net` and `scontent-*.cdninstagram.com` return 403.
- **Meaning:** Those URLs are thumbnail/preview images from saved links. Facebook/Instagram often block them when loaded from another site (hotlinking).
- **Action:** Expected. The app still works; some thumbnails just won't load. Fixing it would require proxying images or using official APIs.

---

## "Auth state changed: INITIAL_SESSION" many times

- **What:** The auth listener logs "Auth state changed: INITIAL_SESSION" repeatedly.
- **Meaning:** Supabase fires an initial session check, and sometimes the layout or navigation causes multiple runs.
- **Action:** Harmless. If you want to reduce log noise, you can guard the log so it only runs for non-initial events (e.g. only log `SIGNED_IN` / `SIGNED_OUT`).

---

## "A listener indicated an asynchronous response by returning true…"

- **What:** "The message channel closed before a response was received."
- **Meaning:** Typically from a **browser extension** (e.g. password manager, ad blocker) or the **service worker** when an async message handler doesn't respond in time. It's not from your app's page code.
- **Action:** Safe to ignore, or try in an incognito window with extensions disabled to confirm.
