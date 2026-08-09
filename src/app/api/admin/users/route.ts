import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, getAdminSupabase } from '@/lib/admin'
import {
  derivePersonState,
  type AdminPersonRow,
  type PersonLifecycleState,
} from '@/lib/admin-metrics'
import { loadAllAdminPeople, metricsFromPeople } from '@/lib/admin-users-data'

export const dynamic = 'force-dynamic'

const VALID_STATES: PersonLifecycleState[] = [
  'awaiting_confirmation',
  'confirmed_no_save',
  'activated',
  'dormant',
]

/**
 * GET /api/admin/users?limit=&offset=&q=&state=
 * Paginated people list. Funnel/insights included when include_metrics=1 (legacy).
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdmin(request)
    if (auth instanceof NextResponse) return auth

    const adminClient = getAdminSupabase()
    const { searchParams } = request.nextUrl
    const limit = Math.min(200, Math.max(1, parseInt(searchParams.get('limit') ?? '50', 10) || 50))
    const offset = Math.max(0, parseInt(searchParams.get('offset') ?? '0', 10) || 0)
    const q = searchParams.get('q')?.trim() || null
    const stateParam = searchParams.get('state')?.trim() || null
    const state =
      stateParam && VALID_STATES.includes(stateParam as PersonLifecycleState)
        ? stateParam
        : null
    const includeMetrics = searchParams.get('include_metrics') === '1'

    // Prefer SQL RPC when available
    const { data: rpcRows, error: rpcError } = await adminClient.rpc('list_admin_people', {
      p_q: q,
      p_state: state,
      p_limit: limit,
      p_offset: offset,
    })

    let users: AdminPersonRow[] = []
    let total = 0

    if (!rpcError && Array.isArray(rpcRows)) {
      users = rpcRows.map((row: Record<string, unknown>) => ({
        id: String(row.id),
        email: (row.email as string | null) ?? null,
        email_confirmed_at: (row.email_confirmed_at as string | null) ?? null,
        created_at: String(row.created_at),
        last_login_at: (row.last_login_at as string | null) ?? null,
        first_place_added_at: (row.first_place_added_at as string | null) ?? null,
        first_trip_created_at: (row.first_trip_created_at as string | null) ?? null,
        last_activity_at: (row.last_activity_at as string | null) ?? null,
        places_count: Number(row.places_count ?? 0),
        trips_count: Number(row.trips_count ?? 0),
        welcome_email_sent: Boolean(row.welcome_email_sent),
        onboarding_nudge_sent: Boolean(row.onboarding_nudge_sent),
        state: (row.state as PersonLifecycleState) || derivePersonState({
          email_confirmed_at: (row.email_confirmed_at as string | null) ?? null,
          places_count: Number(row.places_count ?? 0),
          last_login_at: (row.last_login_at as string | null) ?? null,
        }),
      }))
      const { data: countData, error: countError } = await adminClient.rpc('count_admin_people', {
        p_q: q,
        p_state: state,
      })
      total = countError ? users.length : Number(countData ?? users.length)
    } else {
      // Fallback before migration is applied
      if (rpcError) console.warn('list_admin_people RPC unavailable, falling back:', rpcError.message)
      const all = await loadAllAdminPeople(adminClient)
      const filtered = all.filter((u) => {
        if (q && !(u.email || '').toLowerCase().includes(q.toLowerCase())) return false
        if (state && u.state !== state) return false
        return true
      })
      total = filtered.length
      users = filtered.slice(offset, offset + limit)
    }

    const payload: Record<string, unknown> = {
      users,
      total,
      limit,
      offset,
    }

    if (includeMetrics) {
      const all = await loadAllAdminPeople(adminClient)
      const { funnel, insights, metrics } = metricsFromPeople(all)
      payload.funnel = funnel
      payload.insights = insights
      payload.metrics = metrics
    }

    return NextResponse.json(payload)
  } catch (error) {
    console.error('Error in admin users API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
