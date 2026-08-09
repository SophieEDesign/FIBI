/**
 * Public Travel Guides — server loaders.
 * Guides are editorial/SEO content, separate from user Travel Boards (itineraries).
 * Client-safe helpers live in travel-guides-shared.ts.
 */

import { createClient } from '@/lib/supabase/server'
import type { TravelGuide, TravelGuidePlace } from '@/types/database'
import {
  destinationSlug,
  guideDestinationKey,
  type GuideCard,
} from '@/lib/travel-guides-shared'

export * from '@/lib/travel-guides-shared'

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
