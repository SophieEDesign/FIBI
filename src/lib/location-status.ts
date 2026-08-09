/**
 * Derive location_status from place fields.
 * Never blocks a save — callers always get a status.
 */
export type LocationStatus = 'resolved' | 'needs_review' | 'unknown'

export function deriveLocationStatus(fields: {
  latitude?: number | null
  longitude?: number | null
  place_id?: string | null
  place_name?: string | null
  location_city?: string | null
  location_country?: string | null
  formatted_address?: string | null
}): LocationStatus {
  if (
    fields.latitude != null &&
    fields.longitude != null &&
    !Number.isNaN(Number(fields.latitude)) &&
    !Number.isNaN(Number(fields.longitude))
  ) {
    return 'resolved'
  }
  if (
    fields.place_id ||
    fields.place_name ||
    fields.location_city ||
    fields.location_country ||
    fields.formatted_address
  ) {
    return 'needs_review'
  }
  return 'unknown'
}
