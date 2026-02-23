/**
 * Client-side sign out: navigate to the server signout URL. The server clears
 * Supabase auth cookies and returns 302 to /login. Full-page navigation
 * ensures the browser applies Set-Cookie from the response and then follows
 * the redirect (fetch with redirect: 'manual' can leave cookies unchanged).
 */
const SIGNOUT_URL = '/api/auth/signout'

export function signOut(): void {
  if (typeof window === 'undefined') return
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/76aa133c-0ad7-4146-8805-8947d515aa6c',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'73b393'},body:JSON.stringify({sessionId:'73b393',location:'signout.ts:signOut',message:'signOut navigating to API',data:{runId:'post-fix'},timestamp:Date.now(),hypothesisId:'A'})}).catch(()=>{});
  // #endregion
  window.location.href = SIGNOUT_URL
}
