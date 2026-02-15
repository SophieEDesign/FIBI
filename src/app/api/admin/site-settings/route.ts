import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, getAdminSupabase } from '@/lib/admin'

export const dynamic = 'force-dynamic'

const KEY_EMAIL_FOOTER_ADDRESS = 'email_footer_address'

/**
 * GET: Return site settings (admin only). Used by profile page for admin section.
 */
export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request)
  if (auth instanceof NextResponse) return auth

  const admin = getAdminSupabase()
  const { data, error } = await admin
    .from('site_settings')
    .select('key, value')
    .in('key', [KEY_EMAIL_FOOTER_ADDRESS])

  if (error) {
    console.error('Site settings GET error:', error)
    return NextResponse.json({ error: 'Failed to load settings' }, { status: 500 })
  }

  const map = new Map((data || []).map((r: { key: string; value: string }) => [r.key, r.value]))
  return NextResponse.json({
    email_footer_address: map.get(KEY_EMAIL_FOOTER_ADDRESS) ?? '',
  })
}

/**
 * PATCH: Update site settings (admin only). Body: { email_footer_address?: string }
 */
export async function PATCH(request: NextRequest) {
  const auth = await requireAdmin(request)
  if (auth instanceof NextResponse) return auth

  const body = await request.json().catch(() => ({}))
  const emailFooterAddress = typeof body.email_footer_address === 'string' ? body.email_footer_address.trim() : undefined

  const admin = getAdminSupabase()

  if (emailFooterAddress !== undefined) {
    const { error } = await admin
      .from('site_settings')
      .upsert({ key: KEY_EMAIL_FOOTER_ADDRESS, value: emailFooterAddress }, { onConflict: 'key' })
    if (error) {
      console.error('Site settings PATCH error:', error)
      return NextResponse.json({ error: 'Failed to save email footer address' }, { status: 500 })
    }
  }

  return NextResponse.json({ success: true })
}
