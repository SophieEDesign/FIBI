import { NextResponse } from 'next/server'
import { getAdminSupabase } from '@/lib/admin'

const KEY_GA_MEASUREMENT_ID = 'ga_measurement_id'

/**
 * GET: Public endpoint returning site meta for front-end (e.g. GA measurement ID).
 * No auth required. Used by the analytics script component to load GA when configured.
 */
export async function GET() {
  try {
    const admin = getAdminSupabase()
    const { data, error } = await admin
      .from('site_settings')
      .select('value')
      .eq('key', KEY_GA_MEASUREMENT_ID)
      .single()

    if (error || data?.value == null) {
      return NextResponse.json({ gaMeasurementId: null })
    }
    const value = String(data.value).trim()
    return NextResponse.json({
      gaMeasurementId: value || null,
    })
  } catch {
    return NextResponse.json({ gaMeasurementId: null })
  }
}
