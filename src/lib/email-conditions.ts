/**
 * Shared condition form helpers for automations, segments, and campaigns.
 */
export type ConditionsForm = {
  confirmed?: boolean | null
  places_count_gt?: number | null
  places_count_lt?: number | null
  last_login_days_gt?: number | null
  created_days_gt?: number | null
  created_days_lt?: number | null
  itineraries_count_gt?: number | null
  founding_followup_sent?: boolean | null
}

export function conditionsToForm(c: Record<string, unknown> | null | undefined): ConditionsForm {
  if (!c || typeof c !== 'object') return {}
  return {
    confirmed: c.confirmed === true ? true : c.confirmed === false ? false : null,
    places_count_gt: typeof c.places_count_gt === 'number' ? c.places_count_gt : null,
    places_count_lt: typeof c.places_count_lt === 'number' ? c.places_count_lt : null,
    last_login_days_gt: typeof c.last_login_days_gt === 'number' ? c.last_login_days_gt : null,
    created_days_gt: typeof c.created_days_gt === 'number' ? c.created_days_gt : null,
    created_days_lt: typeof c.created_days_lt === 'number' ? c.created_days_lt : null,
    itineraries_count_gt: typeof c.itineraries_count_gt === 'number' ? c.itineraries_count_gt : null,
    founding_followup_sent:
      c.founding_followup_sent === true ? true : c.founding_followup_sent === false ? false : null,
  }
}

export function formToConditions(f: ConditionsForm): Record<string, unknown> {
  const c: Record<string, unknown> = {}
  if (typeof f.confirmed === 'boolean') c.confirmed = f.confirmed
  if (typeof f.places_count_gt === 'number') c.places_count_gt = f.places_count_gt
  if (typeof f.places_count_lt === 'number') c.places_count_lt = f.places_count_lt
  if (typeof f.last_login_days_gt === 'number') c.last_login_days_gt = f.last_login_days_gt
  if (typeof f.created_days_gt === 'number') c.created_days_gt = f.created_days_gt
  if (typeof f.created_days_lt === 'number') c.created_days_lt = f.created_days_lt
  if (typeof f.itineraries_count_gt === 'number') c.itineraries_count_gt = f.itineraries_count_gt
  if (typeof f.founding_followup_sent === 'boolean') c.founding_followup_sent = f.founding_followup_sent
  return c
}

export function parseConditionsFromQuery(searchParams: URLSearchParams): Record<string, unknown> {
  const filters: Record<string, unknown> = {}
  if (searchParams.get('confirmed') === '1' || searchParams.get('confirmed') === 'true') {
    filters.confirmed = true
  }
  const placesGt = searchParams.get('places_count_gt')
  if (placesGt != null && placesGt !== '') filters.places_count_gt = Number(placesGt)
  const placesLt = searchParams.get('places_count_lt')
  if (placesLt != null && placesLt !== '') filters.places_count_lt = Number(placesLt)
  const loginGt = searchParams.get('last_login_days_gt')
  if (loginGt != null && loginGt !== '') filters.last_login_days_gt = Number(loginGt)
  const createdGt = searchParams.get('created_days_gt')
  if (createdGt != null && createdGt !== '') filters.created_days_gt = Number(createdGt)
  const createdLt = searchParams.get('created_days_lt')
  if (createdLt != null && createdLt !== '') filters.created_days_lt = Number(createdLt)
  const itinGt = searchParams.get('itineraries_count_gt')
  if (itinGt != null && itinGt !== '') filters.itineraries_count_gt = Number(itinGt)
  if (searchParams.get('founding_followup_sent') === '1' || searchParams.get('founding_followup_sent') === 'true') {
    filters.founding_followup_sent = true
  }
  if (searchParams.get('founding_followup_sent') === '0' || searchParams.get('founding_followup_sent') === 'false') {
    filters.founding_followup_sent = false
  }
  return filters
}
