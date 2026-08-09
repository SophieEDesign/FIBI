import type { SupabaseClient } from '@supabase/supabase-js'
import { isUrlSafeForFetch } from '@/lib/ssrf'

const MAX_BYTES = 5 * 1024 * 1024
const ALLOWED_TYPES = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'])

/** True when the URL is already on our public screenshots bucket. */
export function isHostedThumbnailUrl(url: string | null | undefined): boolean {
  if (!url) return false
  try {
    const parsed = new URL(url)
    return (
      parsed.pathname.includes('/storage/v1/object/public/screenshots/') ||
      (parsed.hostname.includes('supabase.co') &&
        parsed.pathname.includes('/screenshots/'))
    )
  } catch {
    return false
  }
}

function extFromContentType(contentType: string): string {
  const type = contentType.split(';')[0].trim().toLowerCase()
  if (type === 'image/png') return 'png'
  if (type === 'image/webp') return 'webp'
  if (type === 'image/gif') return 'gif'
  return 'jpg'
}

function refererForHost(hostname: string): string {
  if (hostname.includes('cdninstagram.com') || hostname.includes('instagram.com')) {
    return 'https://www.instagram.com/'
  }
  if (hostname.includes('fbcdn.net') || hostname.includes('facebook.com')) {
    return 'https://www.facebook.com/'
  }
  if (hostname.includes('tiktokcdn.com') || hostname.includes('tiktok.com')) {
    return 'https://www.tiktok.com/'
  }
  try {
    return `https://${hostname}/`
  } catch {
    return 'https://www.google.com/'
  }
}

/**
 * Download a remote preview image (SSRF-safe) for rehosting.
 * Returns null when the CDN blocks us or the response is not a usable image.
 */
export async function fetchRemoteImageBytes(
  imageUrl: string
): Promise<{ bytes: ArrayBuffer; contentType: string } | null> {
  if (!imageUrl || !isUrlSafeForFetch(imageUrl)) return null

  let parsed: URL
  try {
    parsed = new URL(imageUrl)
  } catch {
    return null
  }

  if (!['http:', 'https:'].includes(parsed.protocol)) return null

  const hostname = parsed.hostname.toLowerCase()
  const referer = refererForHost(hostname)

  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 12000)
    const response = await fetch(imageUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        Accept: 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        Referer: referer,
        Origin: referer.replace(/\/$/, ''),
        'Sec-Fetch-Dest': 'image',
        'Sec-Fetch-Mode': 'cors',
      },
      redirect: 'follow',
    })
    clearTimeout(timeoutId)

    if (!response.ok) {
      console.debug(`persist-thumbnail: fetch ${response.status} for ${hostname}`)
      return null
    }

    const contentType = (response.headers.get('content-type') || 'image/jpeg')
      .split(';')[0]
      .trim()
      .toLowerCase()

    if (!contentType.startsWith('image/') || contentType.includes('svg')) {
      return null
    }

    // Normalize jpg alias
    const normalizedType =
      contentType === 'image/jpg' ? 'image/jpeg' : contentType
    if (!ALLOWED_TYPES.has(normalizedType) && normalizedType !== 'image/jpeg') {
      // Allow unknown image/* if reasonably small (some CDNs send octet-stream)
      if (normalizedType !== 'application/octet-stream' && !normalizedType.startsWith('image/')) {
        return null
      }
    }

    const bytes = await response.arrayBuffer()
    if (!bytes.byteLength || bytes.byteLength > MAX_BYTES) return null

    return {
      bytes,
      contentType:
        normalizedType === 'application/octet-stream' ? 'image/jpeg' : normalizedType,
    }
  } catch (error) {
    console.debug('persist-thumbnail: fetch failed', error)
    return null
  }
}

export type PersistThumbnailResult = {
  publicUrl: string
  path: string
} | null

/**
 * Rehost a remote thumbnail into the screenshots bucket and return the public URL.
 * Path: {userId}/thumbs/{itemId}.{ext}
 */
export async function persistRemoteThumbnail(
  supabase: SupabaseClient,
  opts: {
    userId: string
    itemId: string
    imageUrl: string
  }
): Promise<PersistThumbnailResult> {
  const { userId, itemId, imageUrl } = opts
  if (!userId || !itemId || !imageUrl) return null
  if (isHostedThumbnailUrl(imageUrl)) {
    return { publicUrl: imageUrl, path: '' }
  }

  const fetched = await fetchRemoteImageBytes(imageUrl)
  if (!fetched) return null

  const ext = extFromContentType(fetched.contentType)
  const filePath = `${userId}/thumbs/${itemId}.${ext}`

  const { error } = await supabase.storage.from('screenshots').upload(filePath, fetched.bytes, {
    contentType: fetched.contentType,
    cacheControl: '31536000',
    upsert: true,
  })

  if (error) {
    console.warn('persist-thumbnail: upload failed', error.message)
    return null
  }

  const { data: urlData } = supabase.storage.from('screenshots').getPublicUrl(filePath)
  if (!urlData?.publicUrl) return null

  return { publicUrl: urlData.publicUrl, path: filePath }
}

/**
 * Persist thumbnail for a saved item and update thumbnail_url when successful.
 * Non-throwing; returns the durable URL or null.
 */
export async function persistAndUpdateItemThumbnail(
  supabase: SupabaseClient,
  opts: {
    userId: string
    itemId: string
    imageUrl: string
  }
): Promise<string | null> {
  const result = await persistRemoteThumbnail(supabase, opts)
  if (!result?.publicUrl) return null
  if (isHostedThumbnailUrl(opts.imageUrl) && result.publicUrl === opts.imageUrl) {
    return result.publicUrl
  }

  const { error } = await supabase
    .from('saved_items')
    .update({ thumbnail_url: result.publicUrl })
    .eq('id', opts.itemId)
    .eq('user_id', opts.userId)

  if (error) {
    console.warn('persist-thumbnail: db update failed', error.message)
    return null
  }

  return result.publicUrl
}

/** Client helper: ask the API to rehost a thumbnail (cookie session). */
export async function requestPersistThumbnail(
  itemId: string,
  imageUrl?: string | null
): Promise<string | null> {
  try {
    const response = await fetch('/api/persist-thumbnail', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        itemId,
        ...(imageUrl ? { imageUrl } : {}),
      }),
    })
    if (!response.ok) return null
    const data = await response.json()
    return typeof data.thumbnail_url === 'string' ? data.thumbnail_url : null
  } catch {
    return null
  }
}
