/**
 * Client-side sign out: calls the server signout API (which clears cookies and
 * redirects to /login). Uses fetch with redirect: 'manual' so we can handle
 * 401 (e.g. Vercel Deployment Protection on preview) by still sending the
 * user to /login, and so redirects are followed reliably.
 */
const SIGNOUT_URL = '/api/auth/signout'

export function signOut(): void {
  if (typeof window === 'undefined') return

  fetch(SIGNOUT_URL, {
    method: 'POST',
    credentials: 'include',
    redirect: 'manual',
  })
    .then((res) => {
      if (res.type === 'opaqueredirect' || res.status === 0) {
        window.location.href = '/login'
        return
      }
      if (res.status === 302) {
        const location = res.headers.get('Location')
        window.location.href = location || '/login'
        return
      }
      if (res.status === 401) {
        // e.g. Vercel Deployment Protection on preview – still send user to login
        window.location.href = '/login?message=signout_preview'
        return
      }
      // Fallback: full navigation to signout URL (server will redirect)
      window.location.href = SIGNOUT_URL
    })
    .catch(() => {
      window.location.href = SIGNOUT_URL
    })
}
