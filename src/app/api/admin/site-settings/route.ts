import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, getAdminSupabase } from '@/lib/admin'
import { writeAdminAuditLog } from '@/lib/admin-audit'

export const dynamic = 'force-dynamic'

const KEY_EMAIL_FOOTER_ADDRESS = 'email_footer_address'
const KEY_GA_MEASUREMENT_ID = 'ga_measurement_id'
const ADMIN_KEYS = [KEY_EMAIL_FOOTER_ADDRESS, KEY_GA_MEASUREMENT_ID] as const
const GA_PATTERN = /^G-[A-Z0-9]+$/i

async function loadLastChange(admin: ReturnType<typeof getAdminSupabase>) {
  const { data } = await admin
    .from('admin_audit_logs')
    .select('created_at, actor_id, meta')
    .eq('action', 'settings.change')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!data) return null
  let actor_email: string | null = null
  if (data.actor_id) {
    const { data: userData } = await admin.auth.admin.getUserById(data.actor_id)
    actor_email = userData.user?.email ?? null
  }
  return { created_at: data.created_at as string, actor_email }
}

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
  const last_change = await loadLastChange(admin).catch(() => null)

  return NextResponse.json({
    email_footer_address: map.get(KEY_EMAIL_FOOTER_ADDRESS) ?? '',
    ga_measurement_id: map.get(KEY_GA_MEASUREMENT_ID) ?? '',
    last_change,
  })
}

export async function PATCH(request: NextRequest) {
  const auth = await requireAdmin(request)
  if (auth instanceof NextResponse) return auth

  const body = await request.json().catch(() => ({}))
  const emailFooterAddress =
    typeof body.email_footer_address === 'string' ? body.email_footer_address.trim() : undefined
  const gaMeasurementId =
    typeof body.ga_measurement_id === 'string' ? body.ga_measurement_id.trim() : undefined

  if (gaMeasurementId !== undefined && gaMeasurementId !== '' && !GA_PATTERN.test(gaMeasurementId)) {
    return NextResponse.json(
      { error: 'GA ID must be blank or look like G-XXXXXXXXXX' },
      { status: 400 }
    )
  }

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

  await writeAdminAuditLog(admin, {
    actorId: auth.userId,
    action: 'settings.change',
    targetType: 'site_settings',
    meta: {
      email_footer_address: emailFooterAddress,
      ga_measurement_id: gaMeasurementId,
    },
  })

  const last_change = await loadLastChange(admin).catch(() => null)
  return NextResponse.json({ success: true, last_change })
}
