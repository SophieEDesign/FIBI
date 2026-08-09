/**
 * Public Travel Guides — loaders, slug helpers, save field mapping.
 * Guides are editorial/SEO content, separate from user Travel Boards (itineraries).
 */

import { createClient } from '@/lib/supabase/server'
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
export function guideDestinationKey(guide: Pick<TravelGuide, 'country' | 'destination_name'>): string | null {
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

export async function listPublishedGuides(options?: {
  featuredOnly?: boolean
  country?: string
  destinationSlug?: string
  limit?: number
}): Promise<GuideCard[]> {
  const supabase = await createClient()
  let query = supabase
    .from('travel_guides')
    .select(
      'id, title, slug, excerpt, destination_name, city, country, cover_image_url, featured, published_at, updated_at'
    )
    .eq('status', 'published')
    .order('published_at', { ascending: false })

  if (options?.featuredOnly) {
    query = query.eq('featured', true)
  }
  if (options?.country) {
    query = query.ilike('country', options.country)
  }
  if (options?.limit) {
    query = query.limit(options.limit)
  }

  const { data, error } = await query
  if (error) {
    console.error('listPublishedGuides:', error)
    return []
  }

  let guides = (data || []) as GuideCard[]

  if (options?.destinationSlug) {
    const target = options.destinationSlug.toLowerCase()
    guides = guides.filter((g) => {
      const key = guideDestinationKey(g)
      return key ? destinationSlug(key) === target : false
    })
  }

  return guides
}

export async function getPublishedGuideBySlug(
  slug: string
): Promise<{ guide: TravelGuide; places: TravelGuidePlace[] } | null> {
  const supabase = await createClient()
  const { data: guide, error } = await supabase
    .from('travel_guides')
    .select('*')
    .eq('slug', slug)
    .eq('status', 'published')
    .maybeSingle()

  if (error || !guide) return null

  const { data: places, error: placesError } = await supabase
    .from('travel_guide_places')
    .select('*')
    .eq('guide_id', guide.id)
    .order('display_order', { ascending: true })

  if (placesError) {
    console.error('getPublishedGuideBySlug places:', placesError)
    return { guide: guide as TravelGuide, places: [] }
  }

  return { guide: guide as TravelGuide, places: (places || []) as TravelGuidePlace[] }
}

export async function listRelatedGuides(
  guide: TravelGuide,
  limit = 4
): Promise<GuideCard[]> {
  const all = await listPublishedGuides({ limit: 40 })
  const dest = guideDestinationKey(guide)
  const destSlug = dest ? destinationSlug(dest) : null

  return all
    .filter((g) => g.id !== guide.id)
    .filter((g) => {
      if (!destSlug) return g.country === guide.country
      const key = guideDestinationKey(g)
      return key ? destinationSlug(key) === destSlug : false
    })
    .slice(0, limit)
}

/** Countries/destinations that have at least one published guide. */
export async function listGuideDestinations(): Promise<
  { label: string; slug: string; count: number }[]
> {
  const guides = await listPublishedGuides()
  const counts = new Map<string, { label: string; count: number }>()

  for (const g of guides) {
    const label = guideDestinationKey(g)
    if (!label) continue
    const slug = destinationSlug(label)
    const existing = counts.get(slug)
    if (existing) {
      existing.count += 1
    } else {
      counts.set(slug, { label, count: 1 })
    }
  }

  return [...counts.entries()]
    .map(([slug, { label, count }]) => ({ slug, label, count }))
    .sort((a, b) => a.label.localeCompare(b.label))
}

/** Destination hubs only when ≥2 published guides share that key. */
export async function getDestinationHub(
  destSlug: string
): Promise<{ label: string; slug: string; guides: GuideCard[] } | null> {
  const guides = await listPublishedGuides({ destinationSlug: destSlug })
  if (guides.length < 2) return null
  const label =
    guideDestinationKey(guides[0]) ||
    guides[0].destination_name ||
    guides[0].country ||
    destSlug
  return { label, slug: destSlug, guides }
}

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
    place.source_url?.trim() ||
    (place.place_id
      ? `https://www.google.com/maps/place/?q=place_id:${place.place_id}`
      : `https://fibi.world/travel-guides#${place.id}`)

  return {
    url,
    platform: place.source_platform?.trim() || 'Web',
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

export function defaultBoardNameFromGuide(guide: Pick<TravelGuide, 'destination_name' | 'title'>): string {
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
