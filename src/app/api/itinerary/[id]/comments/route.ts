import { NextRequest, NextResponse } from 'next/server'
import { createClient, createClientWithToken } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

/**
 * List comments for an itinerary (owner or collaborator only)
 * GET /api/itinerary/[id]/comments
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: itineraryId } = await params
    if (!itineraryId) {
      return NextResponse.json({ error: 'Itinerary ID required' }, { status: 400 })
    }

    const authHeader = request.headers.get('authorization')
    const supabaseAuth = await createClient(request)
    let user: { id: string } | null = null
    let supabase = supabaseAuth

    const { data: { user: cookieUser }, error: cookieError } = await supabaseAuth.auth.getUser()
    if (cookieUser && !cookieError) {
      user = cookieUser
    } else if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.substring(7)
      const { data: { user: tokenUser }, error: tokenError } = await supabaseAuth.auth.getUser(token)
      if (tokenUser && !tokenError) {
        user = tokenUser
        supabase = createClientWithToken(token)
      }
    }

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: comments, error } = await supabase
      .from('itinerary_comments')
      .select('id, itinerary_id, user_id, body, created_at')
      .eq('itinerary_id', itineraryId)
      .order('created_at', { ascending: true })

    if (error) {
      if (error.code === 'PGRST116' || error.message?.includes('policy')) {
        return NextResponse.json({ error: 'Itinerary not found or access denied' }, { status: 404 })
      }
      console.error('Error fetching comments:', error)
      return NextResponse.json({ error: 'Failed to fetch comments' }, { status: 500 })
    }

    const list = comments || []
    const userIds = [...new Set(list.map((c) => c.user_id))]
    let nameByUserId: Record<string, string> = {}
    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', userIds)
      nameByUserId = Object.fromEntries(
        (profiles || []).map((p) => [p.id, (p.full_name && p.full_name.trim()) || 'Someone'])
      )
    }

    const withAuthor = list.map((c) => ({
      id: c.id,
      itinerary_id: c.itinerary_id,
      user_id: c.user_id,
      body: c.body,
      created_at: c.created_at,
      author_name: nameByUserId[c.user_id] ?? 'Someone',
    }))

    return NextResponse.json(withAuthor)
  } catch (error: any) {
    console.error('Comments GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * Add a comment (owner or collaborator only)
 * POST /api/itinerary/[id]/comments
 * Body: { body: string }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: itineraryId } = await params
    if (!itineraryId) {
      return NextResponse.json({ error: 'Itinerary ID required' }, { status: 400 })
    }

    const authHeader = request.headers.get('authorization')
    const supabaseAuth = await createClient(request)
    let user: { id: string } | null = null
    let supabase = supabaseAuth

    const { data: { user: cookieUser }, error: cookieError } = await supabaseAuth.auth.getUser()
    if (cookieUser && !cookieError) {
      user = cookieUser
    } else if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.substring(7)
      const { data: { user: tokenUser }, error: tokenError } = await supabaseAuth.auth.getUser(token)
      if (tokenUser && !tokenError) {
        user = tokenUser
        supabase = createClientWithToken(token)
      }
    }

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const commentBody = typeof body?.body === 'string' ? body.body.trim() : ''
    if (!commentBody) {
      return NextResponse.json({ error: 'Comment body is required' }, { status: 400 })
    }

    const { data: comment, error } = await supabase
      .from('itinerary_comments')
      .insert({
        itinerary_id: itineraryId,
        user_id: user.id,
        body: commentBody,
      })
      .select('id, itinerary_id, user_id, body, created_at')
      .single()

    if (error) {
      if (error.code === '23503' || error.message?.includes('policy')) {
        return NextResponse.json({ error: 'Itinerary not found or access denied' }, { status: 404 })
      }
      console.error('Error inserting comment:', error)
      return NextResponse.json({ error: 'Failed to add comment' }, { status: 500 })
    }

    return NextResponse.json(comment)
  } catch (error: any) {
    console.error('Comments POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
