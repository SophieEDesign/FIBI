import webpush from 'web-push'
import { getAdminSupabase } from '@/lib/admin'

export type PushPayload = {
  title: string
  body: string
  url?: string
  tag?: string
}

function getVapidConfig() {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim()
  const privateKey = process.env.VAPID_PRIVATE_KEY?.trim()
  const subject = process.env.VAPID_SUBJECT?.trim() || 'mailto:hello@fibi.world'

  if (!publicKey || !privateKey) {
    return null
  }

  return { publicKey, privateKey, subject }
}

export function isWebPushConfigured(): boolean {
  return getVapidConfig() !== null
}

export function getVapidPublicKey(): string | null {
  return getVapidConfig()?.publicKey ?? null
}

function ensureVapid() {
  const config = getVapidConfig()
  if (!config) {
    throw new Error('Web Push is not configured (missing VAPID keys)')
  }
  webpush.setVapidDetails(config.subject, config.publicKey, config.privateKey)
  return config
}

export type SendPushResult = {
  sent: number
  failed: number
  removed: number
  errors: string[]
}

/**
 * Send a Web Push payload to every stored subscription (or one user's).
 */
export async function sendWebPushToAll(
  payload: PushPayload,
  options?: { userId?: string }
): Promise<SendPushResult> {
  ensureVapid()

  const admin = getAdminSupabase()
  let query = admin
    .from('push_subscriptions')
    .select('id, endpoint, p256dh, auth, user_id')

  if (options?.userId) {
    query = query.eq('user_id', options.userId)
  }

  const { data: rows, error } = await query
  if (error) {
    throw new Error(error.message || 'Failed to load push subscriptions')
  }

  const result: SendPushResult = { sent: 0, failed: 0, removed: 0, errors: [] }
  const body = JSON.stringify({
    title: payload.title.slice(0, 120),
    body: payload.body.slice(0, 240),
    url: payload.url || '/app',
    tag: payload.tag || 'fibi-update',
  })

  for (const row of rows ?? []) {
    try {
      await webpush.sendNotification(
        {
          endpoint: row.endpoint,
          keys: { p256dh: row.p256dh, auth: row.auth },
        },
        body,
        { TTL: 60 * 60 * 24, urgency: 'normal' }
      )
      result.sent += 1
    } catch (err) {
      const statusCode =
        err && typeof err === 'object' && 'statusCode' in err
          ? Number((err as { statusCode?: number }).statusCode)
          : undefined
      // Gone / expired subscription — drop it
      if (statusCode === 404 || statusCode === 410) {
        await admin.from('push_subscriptions').delete().eq('id', row.id)
        result.removed += 1
      } else {
        result.failed += 1
        const msg = err instanceof Error ? err.message : 'Push send failed'
        if (result.errors.length < 10) result.errors.push(msg)
      }
    }
  }

  return result
}
