/**
 * Guest save queue — persist places in localStorage before signup.
 * Merged into saved_items on login/signup.
 */

export const GUEST_SAVES_KEY = 'fibi_guest_saves'

export interface GuestSave {
  id: string
  url: string
  platform: string
  title: string | null
  description: string | null
  thumbnail_url: string | null
  notes: string | null
  location_country: string | null
  location_city: string | null
  place_name: string | null
  place_id: string | null
  latitude: number | null
  longitude: number | null
  formatted_address: string | null
  category: string | null
  created_at: string
}

function canUseStorage(): boolean {
  return typeof window !== 'undefined' && typeof localStorage !== 'undefined'
}

export function getGuestSaves(): GuestSave[] {
  if (!canUseStorage()) return []
  try {
    const raw = localStorage.getItem(GUEST_SAVES_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function addGuestSave(
  save: Omit<GuestSave, 'id' | 'created_at'> & { id?: string; created_at?: string }
): GuestSave {
  const entry: GuestSave = {
    ...save,
    id: save.id || `guest_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    created_at: save.created_at || new Date().toISOString(),
  }
  const existing = getGuestSaves()
  existing.unshift(entry)
  localStorage.setItem(GUEST_SAVES_KEY, JSON.stringify(existing))
  return entry
}

export function removeGuestSave(id: string): void {
  if (!canUseStorage()) return
  const next = getGuestSaves().filter((s) => s.id !== id)
  localStorage.setItem(GUEST_SAVES_KEY, JSON.stringify(next))
}

export function clearGuestSaves(): void {
  if (!canUseStorage()) return
  localStorage.removeItem(GUEST_SAVES_KEY)
}

export function guestSaveCount(): number {
  return getGuestSaves().length
}

/** Insert guest saves into Supabase for the given user, then clear the queue. */
export async function mergeGuestSavesToAccount(
  userId: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: { from: (table: string) => any }
): Promise<{ merged: number; error?: string }> {
  const saves = getGuestSaves()
  if (saves.length === 0) return { merged: 0 }

  const rows = saves.map((s) => ({
    user_id: userId,
    url: s.url,
    platform: s.platform,
    title: s.title,
    description: s.description,
    thumbnail_url: s.thumbnail_url,
    screenshot_url: null,
    notes: s.notes,
    location_country: s.location_country,
    location_city: s.location_city,
    place_name: s.place_name,
    place_id: s.place_id,
    latitude: s.latitude,
    longitude: s.longitude,
    formatted_address: s.formatted_address,
    category: s.category,
    liked: false,
    visited: false,
    planned: false,
    itinerary_id: null,
    trip_position: null,
  }))

  const { error } = await supabase.from('saved_items').insert(rows)
  if (error) {
    console.error('mergeGuestSavesToAccount:', error)
    return { merged: 0, error: error.message }
  }

  clearGuestSaves()
  return { merged: rows.length }
}
