import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, getAdminSupabase } from '@/lib/admin'

export const dynamic = 'force-dynamic'

type RouteContext = { params: Promise<{ id: string }> }

/**
 * POST /api/admin/users/[id]/resend-confirmation
 * Resend signup confirmation email via Supabase Auth admin API.
 */
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const auth = await requireAdmin(request)
    if (auth instanceof NextResponse) return auth

    const { id } = await context.params
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

    const admin = getAdminSupabase()
    const { data: authData, error: getError } = await admin.auth.admin.getUserById(id)
    if (getError || !authData.user?.email) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }
    if (authData.user.email_confirmed_at) {
      return NextResponse.json({ error: 'Email already confirmed' }, { status: 400 })
    }

    const { error } = await admin.auth.resend({
      type: 'signup',
      email: authData.user.email,
    })
    if (error) {
      console.error('resend confirmation', error)
      return NextResponse.json({ error: 'Failed to resend confirmation' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('admin resend-confirmation', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
