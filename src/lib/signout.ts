/**
 * Client-side sign out: navigate to the server signout URL. The server clears
 * Supabase auth cookies and returns 302 to /login. Full-page navigation
 * ensures the browser applies Set-Cookie from the response and then follows
 * the redirect (fetch with redirect: 'manual' can leave cookies unchanged).
 */
const SIGNOUT_URL = '/api/auth/signout'

export function signOut(): void {
  if (typeof window === 'undefined') return
  window.location.href = SIGNOUT_URL
}
