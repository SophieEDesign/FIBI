import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, getAdminSupabase } from '@/lib/admin'
import { getUsersForOneOff } from '@/lib/email-automations'
import type { AutomationConditions } from '@/lib/email-automations'

export const dynamic = 'force-dynamic'

function parseFilters(searchParams: URLSearchParams): AutomationConditions {
  const filters: AutomationConditions = {}
  const confirmed = searchParams.get('confirmed')
  if (confirmed !== null && confirmed !== '') {
    filters.confirmed = confirmed === '1' || confirmed === 'true'
  }
  const placesCountGt = searchParams.get('places_count_gt')
  if (placesCountGt !== null && placesCountGt !== '') {
    const n = parseInt(placesCountGt, 10)
    if (!Number.isNaN(n)) filters.places_count_gt = n
  }
  const placesCountLt = searchParams.get('places_count_lt')
  if (placesCountLt !== null && placesCountLt !== '') {
    const n = parseInt(placesCountLt, 10)
    if (!Number.isNaN(n)) filters.places_count_lt = n
  }
  const itinerariesCountGt = searchParams.get('itineraries_count_gt')
  if (itinerariesCountGt !== null && itinerariesCountGt !== '') {
    const n = parseInt(itinerariesCountGt, 10)
    if (!Number.isNaN(n)) filters.itineraries_count_gt = n
  }
  const lastLoginDaysGt = searchParams.get('last_login_days_gt')
  if (lastLoginDaysGt !== null && lastLoginDaysGt !== '') {
    const n = parseInt(lastLoginDaysGt, 10)
    if (!Number.isNaN(n)) filters.last_login_days_gt = n
  }
  const createdDaysGt = searchParams.get('created_days_gt')
  if (createdDaysGt !== null && createdDaysGt !== '') {
    const n = parseInt(createdDaysGt, 10)
    if (!Number.isNaN(n)) filters.created_days_gt = n
  }
  const createdDaysLt = searchParams.get('created_days_lt')
  if (createdDaysLt !== null && createdDaysLt !== '') {
    const n = parseInt(createdDaysLt, 10)
    if (!Number.isNaN(n)) filters.created_days_lt = n
  }
  const foundingFollowupSent = searchParams.get('founding_followup_sent')
  if (foundingFollowupSent !== null && foundingFollowupSent !== '') {
    filters.founding_followup_sent = foundingFollowupSent === '1' || foundingFollowupSent === 'true'
  }
  return filters
}

/**
 * GET /api/admin/emails/recipients?confirmed=1&places_count_gt=1&...
 * Returns count (and optional sample) of users matching filters. Always restricts to marketing_opt_in.
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdmin(request)
    if (auth instanceof NextResponse) return auth

    const filters = parseFilters(request.nextUrl.searchParams)
    const admin = getAdminSupabase()
    const users = await getUsersForOneOff(admin, Object.keys(filters).length ? filters : null)

    const sampleSize = 5
    const sample = users.slice(0, sampleSize).map((u) => ({
      id: u.id,
      email: u.email,
      email_confirmed_at: u.email_confirmed_at ?? null,
      places_count: u.places_count,
      itineraries_count: u.itineraries_count,
    }))

    return NextResponse.json({ count: users.length, sample })
  } catch (e) {
    console.error('recipients', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
