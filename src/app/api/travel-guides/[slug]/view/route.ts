import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAdminSupabase } from '@/lib/admin'

export const dynamic = 'force-dynamic'

/**
 * POST /api/travel-guides/[slug]/view
 * Public beacon: record a guide page view (best-effort).
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params
    if (!slug) return NextResponse.json({ ok: true })

    const anon = await createClient()
    const { data: guide } = await anon
      .from('travel_guides')
      .select('id')
      .eq('slug', slug)
      .eq('status', 'published')
      .maybeSingle()

    if (!guide?.id) return NextResponse.json({ ok: true })

    const admin = getAdminSupabase()
    await admin.from('travel_guide_views').insert({ guide_id: guide.id })
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('guide view beacon', e)
    return NextResponse.json({ ok: true })
  }
}
