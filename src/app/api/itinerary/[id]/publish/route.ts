import { NextRequest, NextResponse } from 'next/server'
import { createClient, createClientWithToken } from '@/lib/supabase/server'
import { slugify } from '@/lib/slugify'

export const dynamic = 'force-dynamic'

function getBaseUrl(request: NextRequest): string {
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, '')
  }
  const origin = request.headers.get('origin') || request.nextUrl.origin
  return origin.replace(/\/$/, '')
}

async function getAuthedClient(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  const supabaseAuth = await createClient(request)
  let user: { id: string } | null = null
  let supabase = supabaseAuth

  const { data: { user: cookieUser }, error: cookieError } = await supabaseAuth.auth.getUser()
  if (cookieUser && !cookieError) {
    user = cookieUser
    supabase = supabaseAuth
  } else if (authHeader?.startsWith('Bearer ')) {
    const accessToken = authHeader.substring(7)
    const { data: { user: tokenUser }, error: tokenError } =
      await supabaseAuth.auth.getUser(accessToken)
    if (tokenUser && !tokenError) {
      user = tokenUser
      supabase = createClientWithToken(accessToken)
    }
  }

  return { user, supabase }
}

/**
 * POST /api/itinerary/[id]/publish — publish trip as public trip board
 * DELETE /api/itinerary/[id]/publish — unpublish
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { user, supabase } = await getAuthedClient(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: itinerary, error: fetchError } = await supabase
      .from('itineraries')
      .select('id, name, user_id, public_slug, published_at')
      .eq('id', id)
      .single()

    if (fetchError || !itinerary) {
      return NextResponse.json({ error: 'Trip not found' }, { status: 404 })
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
      return NextResponse.json({ error: 'Failed to publish' }, { status: 500 })
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
    const { user, supabase } = await getAuthedClient(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: itinerary, error: fetchError } = await supabase
      .from('itineraries')
      .select('id, user_id')
      .eq('id', id)
      .single()

    if (fetchError || !itinerary) {
      return NextResponse.json({ error: 'Trip not found' }, { status: 404 })
    }
    if (itinerary.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { error: updateError } = await supabase
      .from('itineraries')
      .update({ published_at: null })
      .eq('id', id)

    if (updateError) {
      return NextResponse.json({ error: 'Failed to unpublish' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Unpublish error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
