import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, getAdminSupabase } from '@/lib/admin'

export const dynamic = 'force-dynamic'

const KEY_EMAIL_FOOTER_ADDRESS = 'email_footer_address'
const KEY_GA_MEASUREMENT_ID = 'ga_measurement_id'

const ADMIN_KEYS = [KEY_EMAIL_FOOTER_ADDRESS, KEY_GA_MEASUREMENT_ID] as const

/**
 * GET: Return site settings (admin only). Used by admin dashboard.
 */
export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request)
  if (auth instanceof NextResponse) return auth

  const admin = getAdminSupabase()
  const { data, error } = await admin
    .from('site_settings')
    .select('key, value')
    .in('key', [...ADMIN_KEYS])

  if (error) {
    console.error('Site settings GET error:', error)
    return NextResponse.json({ error: 'Failed to load settings' }, { status: 500 })
  }

  const map = new Map((data || []).map((r: { key: string; value: string }) => [r.key, r.value]))
  return NextResponse.json({
    email_footer_address: map.get(KEY_EMAIL_FOOTER_ADDRESS) ?? '',
    ga_measurement_id: map.get(KEY_GA_MEASUREMENT_ID) ?? '',
  })
}

/**
 * PATCH: Update site settings (admin only). Body: { email_footer_address?: string, ga_measurement_id?: string }
 */
export async function PATCH(request: NextRequest) {
  const auth = await requireAdmin(request)
  if (auth instanceof NextResponse) return auth

  const body = await request.json().catch(() => ({}))
  const emailFooterAddress = typeof body.email_footer_address === 'string' ? body.email_footer_address.trim() : undefined
  const gaMeasurementId = typeof body.ga_measurement_id === 'string' ? body.ga_measurement_id.trim() : undefined

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

  if (gaMeasurementId !== undefined) {
    const { error } = await admin
      .from('site_settings')
      .upsert({ key: KEY_GA_MEASUREMENT_ID, value: gaMeasurementId }, { onConflict: 'key' })
    if (error) {
      console.error('Site settings PATCH error:', error)
      return NextResponse.json({ error: 'Failed to save Google Analytics ID' }, { status: 500 })
    }
  }

  return NextResponse.json({ success: true })
}
