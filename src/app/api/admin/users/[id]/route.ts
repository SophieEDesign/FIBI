import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, getAdminSupabase } from '@/lib/admin'
import { derivePersonState } from '@/lib/admin-metrics'

export const dynamic = 'force-dynamic'

type RouteContext = { params: Promise<{ id: string }> }

/**
 * GET /api/admin/users/[id] — person detail for admin panel.
 */
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const auth = await requireAdmin(request)
    if (auth instanceof NextResponse) return auth

    const { id } = await context.params
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

    const admin = getAdminSupabase()
    const { data: authData, error: authError } = await admin.auth.admin.getUserById(id)
    if (authError || !authData.user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }
    const authUser = authData.user

    const { data: profile } = await admin
      .from('profiles')
      .select(
        'welcome_email_sent, onboarding_nudge_sent, email_verified_at, founding_followup_sent, marketing_opt_in, role, created_at'
      )
      .eq('id', id)
      .maybeSingle()

    const { data: act } = await admin
      .from('admin_activation_stats')
      .select('first_place_at, last_place_at, first_trip_at, last_trip_at, places_count, trips_count')
      .eq('user_id', id)
      .maybeSingle()

    const { data: welcomeOpen } = await admin
      .from('email_logs')
      .select('opened_at, sent_at')
      .eq('user_id', id)
      .eq('template_slug', 'welcome')
      .eq('status', 'sent')
      .order('sent_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    const { data: nudgeLog } = await admin
      .from('email_logs')
      .select('sent_at, opened_at')
      .eq('user_id', id)
      .eq('template_slug', 'onboarding-nudge')
      .eq('status', 'sent')
      .order('sent_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    const emailConfirmedAt = profile?.email_verified_at ?? authUser.email_confirmed_at ?? null
    const lastLoginAt = authUser.last_sign_in_at ?? null
    const placesCount = act?.places_count ?? 0
    const state = derivePersonState({
      email_confirmed_at: emailConfirmedAt,
      places_count: placesCount,
      last_login_at: lastLoginAt,
    })

    return NextResponse.json({
      user: {
        id: authUser.id,
        email: authUser.email ?? null,
        email_confirmed_at: emailConfirmedAt,
        created_at: authUser.created_at,
        last_login_at: lastLoginAt,
        first_place_added_at: act?.first_place_at ?? null,
        first_trip_created_at: act?.first_trip_at ?? null,
        places_count: placesCount,
        trips_count: act?.trips_count ?? 0,
        welcome_email_sent: profile?.welcome_email_sent ?? false,
        onboarding_nudge_sent: profile?.onboarding_nudge_sent ?? false,
        founding_followup_sent: profile?.founding_followup_sent ?? false,
        marketing_opt_in: profile?.marketing_opt_in ?? false,
        role: profile?.role ?? 'user',
        state,
        welcome_opened_at: welcomeOpen?.opened_at ?? null,
        welcome_sent_at: welcomeOpen?.sent_at ?? null,
        nudge_sent_at: nudgeLog?.sent_at ?? null,
      },
    })
  } catch (e) {
    console.error('admin/users/[id] GET', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * DELETE /api/admin/users/[id] — permanently delete auth user (cascades profile).
 */
export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const auth = await requireAdmin(request)
    if (auth instanceof NextResponse) return auth

    const { id } = await context.params
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })
    if (auth.userId === id) {
      return NextResponse.json({ error: 'You cannot delete your own account' }, { status: 400 })
    }

    const admin = getAdminSupabase()
    const { error } = await admin.auth.admin.deleteUser(id)
    if (error) {
      console.error('deleteUser', error)
      return NextResponse.json({ error: 'Failed to delete account' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('admin/users/[id] DELETE', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
