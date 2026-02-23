/**
 * Client-side sign out: calls the server signout API (which clears cookies and
 * redirects to /login). Uses fetch with redirect: 'manual' so we can handle
 * 401 (e.g. Vercel Deployment Protection on preview) by still sending the
 * user to /login, and so redirects are followed reliably.
 */
const SIGNOUT_URL = '/api/auth/signout'

export function signOut(): void {
  if (typeof window === 'undefined') return
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/76aa133c-0ad7-4146-8805-8947d515aa6c',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'73b393'},body:JSON.stringify({sessionId:'73b393',location:'signout.ts:signOut',message:'signOut entered',data:{},timestamp:Date.now(),hypothesisId:'A'})}).catch(()=>{});
  // #endregion

  fetch(SIGNOUT_URL, {
    method: 'POST',
    credentials: 'include',
    redirect: 'manual',
  })
    .then((res) => {
      const locationHeader = res.headers.get('Location')
      const href = res.type === 'opaqueredirect' || res.status === 0 ? '/login' : res.status === 302 ? (locationHeader || '/login') : res.status === 401 ? '/login?message=signout_preview' : SIGNOUT_URL
      if (res.status !== 302 && res.status !== 401 && res.type !== 'opaqueredirect' && res.status !== 0) {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/76aa133c-0ad7-4146-8805-8947d515aa6c',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'73b393'},body:JSON.stringify({sessionId:'73b393',location:'signout.ts:then',message:'fetch response',data:{status:res.status,type:res.type,redirected:res.redirected,locationHeader:locationHeader||null,href},timestamp:Date.now(),hypothesisId:'B'})}).catch(()=>{});
        // #endregion
      }
      const goTo = res.type === 'opaqueredirect' || res.status === 0 ? '/login' : res.status === 302 ? (locationHeader || '/login') : res.status === 401 ? '/login?message=signout_preview' : SIGNOUT_URL
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/76aa133c-0ad7-4146-8805-8947d515aa6c',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'73b393'},body:JSON.stringify({sessionId:'73b393',location:'signout.ts:beforeAssign',message:'navigating',data:{status:res.status,type:res.type,goTo},timestamp:Date.now(),hypothesisId:'D'})}).catch(()=>{});
      // #endregion
      window.location.href = goTo
      return
    })
    .catch((err) => {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/76aa133c-0ad7-4146-8805-8947d515aa6c',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'73b393'},body:JSON.stringify({sessionId:'73b393',location:'signout.ts:catch',message:'fetch failed',data:{err:String(err)},timestamp:Date.now(),hypothesisId:'B'})}).catch(()=>{});
      // #endregion
      window.location.href = SIGNOUT_URL
    })
}
