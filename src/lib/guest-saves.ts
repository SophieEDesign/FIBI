/**
 * Guest save queue — persist places in localStorage before signup.
 * Merged into saved_items on login/signup.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { deriveLocationStatus } from '@/lib/location-status'

export const GUEST_SAVES_KEY = 'fibi_guest_saves'
export const GUEST_PENDING_BOARD_KEY = 'fibi_guest_pending_board'

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
  location_status?: 'resolved' | 'needs_review' | 'unknown' | null
  created_at: string
}

export interface GuestPendingBoard {
  name: string
  cover_image_url?: string | null
  /** Guest save ids that should land on this board */
  saveIds: string[]
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
  // Dedupe by place_id or url
  const filtered = existing.filter((s) => {
    if (entry.place_id && s.place_id && s.place_id === entry.place_id) return false
    if (entry.url && s.url && s.url === entry.url) return false
    return true
  })
  filtered.unshift(entry)
  localStorage.setItem(GUEST_SAVES_KEY, JSON.stringify(filtered))
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

export function setGuestPendingBoard(board: GuestPendingBoard): void {
  if (!canUseStorage()) return
  localStorage.setItem(GUEST_PENDING_BOARD_KEY, JSON.stringify(board))
}

export function getGuestPendingBoard(): GuestPendingBoard | null {
  if (!canUseStorage()) return null
  try {
    const raw = localStorage.getItem(GUEST_PENDING_BOARD_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed?.name || !Array.isArray(parsed.saveIds)) return null
    return parsed as GuestPendingBoard
  } catch {
    return null
  }
}

export function clearGuestPendingBoard(): void {
  if (!canUseStorage()) return
  localStorage.removeItem(GUEST_PENDING_BOARD_KEY)
}

/** Insert guest saves into Supabase for the given user, then clear the queue. */
export async function mergeGuestSavesToAccount(
  userId: string,
  supabase: SupabaseClient
): Promise<{ merged: number; itinerary_id?: string; error?: string }> {
  const saves = getGuestSaves()
  if (saves.length === 0) {
    clearGuestPendingBoard()
    return { merged: 0 }
  }

  const pending = getGuestPendingBoard()
  let itineraryId: string | null = null

  if (pending?.name && pending.saveIds.length > 0) {
    const { data: itinerary, error: itineraryError } = await supabase
      .from('itineraries')
      .insert({
        user_id: userId,
        name: pending.name,
        cover_image_url: pending.cover_image_url ?? null,
      })
      .select('id')
      .single()

    if (itineraryError) {
      console.error('mergeGuestSavesToAccount board:', itineraryError)
    } else {
      itineraryId = itinerary?.id ?? null
    }
  }

  const pendingIds = new Set(pending?.saveIds || [])

  const rows = saves.map((s, index) => {
    const onBoard = itineraryId && pendingIds.has(s.id)
    return {
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
      itinerary_id: onBoard ? itineraryId : null,
      trip_position: onBoard ? index : null,
      location_status:
        (s as GuestSave & { location_status?: string }).location_status ||
        deriveLocationStatus(s),
    }
  })

  const { data: inserted, error } = await supabase
    .from('saved_items')
    .insert(rows)
    .select('id, thumbnail_url')

  if (error) {
    console.error('mergeGuestSavesToAccount:', error)
    return { merged: 0, error: error.message }
  }

  clearGuestSaves()
  clearGuestPendingBoard()

  // Rehost preview images in the background (CDN URLs expire quickly)
  if (typeof window !== 'undefined' && inserted?.length) {
    for (const row of inserted) {
      if (row.thumbnail_url) {
        void fetch('/api/persist-thumbnail', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ itemId: row.id, imageUrl: row.thumbnail_url }),
        }).catch(() => {})
      }
    }
  }

  return {
    merged: rows.length,
    itinerary_id: itineraryId || undefined,
  }
}
