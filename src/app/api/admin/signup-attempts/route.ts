import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, getAdminSupabase } from '@/lib/admin'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/signup-attempts?limit=&offset=
 * Read-only blocked signup log (newest first).
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdmin(request)
    if (auth instanceof NextResponse) return auth

    const { searchParams } = request.nextUrl
    const limit = Math.min(200, Math.max(1, parseInt(searchParams.get('limit') ?? '50', 10) || 50))
    const offset = Math.max(0, parseInt(searchParams.get('offset') ?? '0', 10) || 0)

    const admin = getAdminSupabase()
    const { data, error, count } = await admin
      .from('signup_attempt_logs')
      .select('id, email, ip_address, user_agent, blocked_reason, created_at', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      console.error('signup-attempts', error)
      return NextResponse.json({ error: 'Failed to load signup attempts' }, { status: 500 })
    }

    return NextResponse.json({
      attempts: data ?? [],
      total: typeof count === 'number' ? count : (data ?? []).length,
      limit,
      offset,
    })
  } catch (e) {
    console.error('admin/signup-attempts', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
