/**
 * Client helpers for Web Push subscribe / unsubscribe.
 */

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

export function isPushSupported(): boolean {
  if (typeof window === 'undefined') return false
  return (
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  )
}

/** iOS only supports Web Push for PWAs added to the Home Screen. */
export function isIosStandalone(): boolean {
  if (typeof window === 'undefined') return false
  const nav = window.navigator as Navigator & { standalone?: boolean }
  return nav.standalone === true || window.matchMedia('(display-mode: standalone)').matches
}

export function isLikelyIos(): boolean {
  if (typeof window === 'undefined') return false
  const ua = navigator.userAgent
  const iPadOs = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1
  return /iPad|iPhone|iPod/.test(ua) || iPadOs
}

export async function getPushRegistration(): Promise<ServiceWorkerRegistration | null> {
  if (!isPushSupported()) return null
  return navigator.serviceWorker.ready
}

export async function subscribeToPush(
  vapidPublicKey: string,
  authHeaders: Record<string, string>
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!isPushSupported()) {
    return { ok: false, error: 'Push is not supported in this browser.' }
  }
  if (isLikelyIos() && !isIosStandalone()) {
    return {
      ok: false,
      error: 'On iPhone, add FIBI to your Home Screen first, then turn on notifications.',
    }
  }

  const permission = await Notification.requestPermission()
  if (permission !== 'granted') {
    return { ok: false, error: 'Notifications are off for this browser.' }
  }

  const registration = await getPushRegistration()
  if (!registration) {
    return { ok: false, error: 'App is still loading. Try again in a moment.' }
  }

  let subscription = await registration.pushManager.getSubscription()
  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey) as BufferSource,
    })
  }

  const json = subscription.toJSON()
  if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
    return { ok: false, error: "That didn't work. Try again." }
  }

  const res = await fetch('/api/push/subscribe', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...authHeaders },
    body: JSON.stringify({
      endpoint: json.endpoint,
      keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
      user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
    }),
  })

  if (!res.ok) {
    return { ok: false, error: "That didn't work. Try again." }
  }

  return { ok: true }
}

export async function unsubscribeFromPush(
  authHeaders: Record<string, string>
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!isPushSupported()) {
    return { ok: false, error: 'Push is not supported in this browser.' }
  }

  const registration = await getPushRegistration()
  const subscription = await registration?.pushManager.getSubscription()
  const endpoint = subscription?.endpoint

  if (subscription) {
    try {
      await subscription.unsubscribe()
    } catch {
      // continue — still remove from server
    }
  }

  if (endpoint) {
    const res = await fetch('/api/push/subscribe', {
      method: 'DELETE',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', ...authHeaders },
      body: JSON.stringify({ endpoint }),
    })
    if (!res.ok) {
      return { ok: false, error: "That didn't work. Try again." }
    }
  }

  return { ok: true }
}
