# Console messages – what they mean

## Manifest 401

- **What:** The PWA manifest request returns 401, so “Add to Home Screen” / install can fail.
- **In the app:** The manifest is now served from **`/api/manifest`** (no auth in that route). The `<link rel="manifest">` in the layout points there.
- **If you still see 401:** It’s almost certainly **Vercel Deployment Protection** (or Password Protection). That runs before your app and returns 401 for unauthenticated requests, including the manifest.
  - **Fix:** In Vercel → your project → **Settings** → **Deployment Protection**, either:
    - Turn **off** “Vercel Authentication” / “Password Protection” for this project, or
    - Use **Standard Protection** and add a bypass (e.g. allowlist) for the production URL if your plan supports it.
  - After that, open `https://your-app.vercel.app/api/manifest` in an incognito window; it should return 200 and JSON.

---

## Supabase token 400

- **What:** `supabase.co/auth/v1/token?grant_type=password` returns 400.
- **Meaning:** Usually wrong email/password or a temporary auth error (e.g. “Invalid login credentials”).
- **Action:** Only a problem if you can’t log in. If login works, you can ignore it (e.g. from an old tab or a failed attempt).

---

## Facebook/Instagram image 403

- **What:** Requests to `scontent-*.xx.fbcdn.net` and `scontent-*.cdninstagram.com` return 403.
- **Meaning:** Those URLs are thumbnail/preview images from saved links. Facebook/Instagram often block them when loaded from another site (hotlinking).
- **Action:** Expected. The app still works; some thumbnails just won’t load. Fixing it would require proxying images or using official APIs.

---

## “Auth state changed: INITIAL_SESSION” many times

- **What:** The auth listener logs “Auth state changed: INITIAL_SESSION” repeatedly.
- **Meaning:** Supabase fires an initial session check, and sometimes the layout or navigation causes multiple runs.
- **Action:** Harmless. If you want to reduce log noise, you can guard the log so it only runs for non-initial events (e.g. only log `SIGNED_IN` / `SIGNED_OUT`).

---

## “A listener indicated an asynchronous response by returning true…”

- **What:** “The message channel closed before a response was received.”
- **Meaning:** Typically from a **browser extension** (e.g. password manager, ad blocker) or the **service worker** when an async message handler doesn’t respond in time. It’s not from your app’s page code.
- **Action:** Safe to ignore, or try in an incognito window with extensions disabled to confirm.
