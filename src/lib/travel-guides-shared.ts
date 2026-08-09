/**
 * Client-safe Travel Guide helpers (no next/headers / server Supabase).
 */

import { slugify } from '@/lib/slugify'
import { deriveLocationStatus } from '@/lib/location-status'
import type { TravelGuide, TravelGuidePlace } from '@/types/database'

export function getSiteUrl(): string {
  if (typeof process !== 'undefined') {
    if (process.env.NEXT_PUBLIC_SITE_URL) {
      return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, '')
    }
    if (process.env.VERCEL_URL) {
      return `https://${process.env.VERCEL_URL}`
    }
  }
  return 'https://fibi.world'
}

export function destinationSlug(input: string): string {
  return slugify(input).slice(0, 60) || 'destination'
}

/** Prefer country for destination hubs; fall back to destination_name. */
export function guideDestinationKey(
  guide: Pick<TravelGuide, 'country' | 'destination_name'>
): string | null {
  const raw = (guide.country || guide.destination_name || '').trim()
  return raw || null
}

export function sourceCtaLabel(platform: string | null | undefined): string {
  const p = (platform || '').toLowerCase()
  if (p.includes('tiktok')) return 'Watch the TikTok'
  if (p.includes('instagram')) return 'View original post'
  if (p.includes('youtube')) return 'See video'
  if (p.includes('google')) return 'View on Maps'
  return 'View original'
}

export function videoCtaLabel(platform: string | null | undefined): string {
  const p = (platform || '').toLowerCase()
  if (p.includes('tiktok')) return 'Watch the TikTok'
  if (p.includes('instagram')) return 'Watch the Reel'
  if (p.includes('youtube')) return 'See video'
  return 'Watch the video'
}

export function foundOnLabel(platform: string | null | undefined): string {
  const p = (platform || '').toLowerCase()
  if (p.includes('tiktok')) return 'Found on TikTok'
  if (p.includes('instagram')) return 'Found on Instagram'
  if (p.includes('youtube')) return 'Found on YouTube'
  return 'Found on the web'
}

export type GuideCard = Pick<
  TravelGuide,
  | 'id'
  | 'title'
  | 'slug'
  | 'excerpt'
  | 'destination_name'
  | 'city'
  | 'country'
  | 'cover_image_url'
  | 'featured'
  | 'published_at'
  | 'updated_at'
> & { place_count?: number }

export function groupPlacesBySection(
  places: TravelGuidePlace[]
): { section: string; places: TravelGuidePlace[] }[] {
  const order: string[] = []
  const map = new Map<string, TravelGuidePlace[]>()

  for (const place of places) {
    const section = (place.section || '').trim() || 'Places'
    if (!map.has(section)) {
      map.set(section, [])
      order.push(section)
    }
    map.get(section)!.push(place)
  }

  return order.map((section) => ({ section, places: map.get(section)! }))
}

/** Map a guide place into a saved_items insert row (without user_id / itinerary). */
export function guidePlaceToSavedItemFields(place: TravelGuidePlace) {
  const lat = place.latitude
  const lng = place.longitude
  const url =
    place.video_url?.trim() ||
    place.source_url?.trim() ||
    (place.place_id
      ? `https://www.google.com/maps/place/?q=place_id:${place.place_id}`
      : `https://fibi.world/travel-guides#${place.id}`)

  return {
    url,
    platform:
      place.source_platform?.trim() ||
      (place.video_url?.trim() ? 'TikTok' : 'Web'),
    title: place.name,
    description: place.description,
    thumbnail_url: place.image_url,
    screenshot_url: null as string | null,
    location_country: place.location_country,
    location_city: place.location_city,
    place_name: place.name,
    place_id: place.place_id,
    latitude: lat,
    longitude: lng,
    formatted_address: place.formatted_address,
    category: sectionToCategory(place.section),
    notes: null as string | null,
    liked: false,
    visited: false,
    planned: false,
    location_status: deriveLocationStatus({
      latitude: lat,
      longitude: lng,
      place_id: place.place_id,
      place_name: place.name,
      location_city: place.location_city,
      location_country: place.location_country,
      formatted_address: place.formatted_address,
    }),
  }
}

function sectionToCategory(section: string | null): string | null {
  if (!section) return null
  const s = section.toLowerCase()
  if (s.includes('beach')) return 'Beach'
  if (s.includes('restaurant') || s.includes('food') || s.includes('café') || s.includes('cafe'))
    return 'Food'
  if (s.includes('stay') || s.includes('hotel')) return 'Stay'
  if (s.includes('nature') || s.includes('hike') || s.includes('viewpoint')) return 'Nature'
  if (s.includes('city') || s.includes('village')) return 'City'
  if (s.includes('do') || s.includes('activity')) return 'Activity'
  return 'Other'
}

export function defaultBoardNameFromGuide(
  guide: Pick<TravelGuide, 'destination_name' | 'title'>
): string {
  if (guide.destination_name?.trim()) {
    return `${guide.destination_name.trim()} Ideas`
  }
  return guide.title
}

export function formatGuideDate(iso: string | null | undefined): string | null {
  if (!iso) return null
  try {
    return new Date(iso).toLocaleDateString('en-GB', {
      month: 'long',
      year: 'numeric',
    })
  } catch {
    return null
  }
}
