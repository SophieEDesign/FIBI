import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth'
import {
  isHostedThumbnailUrl,
  persistAndUpdateItemThumbnail,
} from '@/lib/persist-thumbnail'

export const dynamic = 'force-dynamic'

/**
 * Rehost a saved item's preview image into Supabase Storage.
 * POST { itemId, imageUrl? } → { thumbnail_url }
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await requireUser(request)
    if (auth instanceof NextResponse) return auth

    const { supabase, userId } = auth

    const body = await request.json().catch(() => null)
    const itemId = typeof body?.itemId === 'string' ? body.itemId.trim() : ''
    const imageUrlArg =
      typeof body?.imageUrl === 'string' && body.imageUrl.trim()
        ? body.imageUrl.trim()
        : null

    if (!itemId) {
      return NextResponse.json({ error: 'itemId is required' }, { status: 400 })
    }

    const { data: item, error: itemError } = await supabase
      .from('saved_items')
      .select('id, user_id, thumbnail_url')
      .eq('id', itemId)
      .eq('user_id', userId)
      .maybeSingle()

    if (itemError || !item) {
      return NextResponse.json({ error: 'Place not found' }, { status: 404 })
    }

    const imageUrl = imageUrlArg || item.thumbnail_url
    if (!imageUrl) {
      return NextResponse.json({ error: 'No image to save' }, { status: 400 })
    }

    if (isHostedThumbnailUrl(imageUrl)) {
      if (item.thumbnail_url !== imageUrl) {
        await supabase
          .from('saved_items')
          .update({ thumbnail_url: imageUrl })
          .eq('id', itemId)
          .eq('user_id', userId)
      }
      return NextResponse.json({ thumbnail_url: imageUrl, already_hosted: true })
    }

    const durableUrl = await persistAndUpdateItemThumbnail(supabase, {
      userId,
      itemId,
      imageUrl,
    })

    if (!durableUrl) {
      // Keep the external URL; CDN may still work briefly via proxy
      return NextResponse.json(
        { thumbnail_url: item.thumbnail_url, persisted: false },
        { status: 200 }
      )
    }

    return NextResponse.json({ thumbnail_url: durableUrl, persisted: true })
  } catch (error) {
    console.error('persist-thumbnail error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
