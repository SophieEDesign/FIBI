import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth'
import { isAnonymousUser } from '@/lib/anonymous-auth'
import { slugify } from '@/lib/slugify'

export const dynamic = 'force-dynamic'

function getBaseUrl(request: NextRequest): string {
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, '')
  }
  const origin = request.headers.get('origin') || request.nextUrl.origin
  return origin.replace(/\/$/, '')
}

/**
 * POST /api/itinerary/[id]/publish — make travel board shareable by link
 * DELETE /api/itinerary/[id]/publish — make private again
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const auth = await requireUser(request)
    if (auth instanceof NextResponse) return auth
    const { user, supabase } = auth
    if (isAnonymousUser(user)) {
      return NextResponse.json(
        { error: 'Create an account to share a travel board.' },
        { status: 403 }
      )
    }

    const { data: itinerary, error: fetchError } = await supabase
      .from('itineraries')
      .select('id, name, user_id, public_slug, published_at')
      .eq('id', id)
      .single()

    if (fetchError || !itinerary) {
      return NextResponse.json({ error: 'Board not found' }, { status: 404 })
    }
    if (itinerary.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    let slug = itinerary.public_slug as string | null
    if (!slug) {
      const base = slugify(itinerary.name || 'trip')
      slug = `${base}-${id.slice(0, 8)}`

      // Ensure uniqueness
      const { data: clash } = await supabase
        .from('itineraries')
        .select('id')
        .eq('public_slug', slug)
        .maybeSingle()
      if (clash && clash.id !== id) {
        slug = `${base}-${id.replace(/-/g, '').slice(0, 10)}`
      }
    }

    const { data: updated, error: updateError } = await supabase
      .from('itineraries')
      .update({
        published_at: itinerary.published_at || new Date().toISOString(),
        public_slug: slug,
      })
      .eq('id', id)
      .select('id, name, public_slug, published_at')
      .single()

    if (updateError || !updated) {
      console.error('Publish error:', updateError)
      return NextResponse.json({ error: 'Failed to share board' }, { status: 500 })
    }

    const baseUrl = getBaseUrl(request)
    return NextResponse.json({
      success: true,
      public_slug: updated.public_slug,
      published_at: updated.published_at,
      board_url: `${baseUrl}/board/${updated.public_slug}`,
    })
  } catch (err) {
    console.error('Publish error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const auth = await requireUser(request)
    if (auth instanceof NextResponse) return auth
    const { user, supabase } = auth

    const { data: itinerary, error: fetchError } = await supabase
      .from('itineraries')
      .select('id, user_id')
      .eq('id', id)
      .single()

    if (fetchError || !itinerary) {
      return NextResponse.json({ error: 'Board not found' }, { status: 404 })
    }
    if (itinerary.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { error: updateError } = await supabase
      .from('itineraries')
      .update({ published_at: null })
      .eq('id', id)

    if (updateError) {
      return NextResponse.json({ error: 'Failed to make board private' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Unpublish error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
