import type { Itinerary, SavedItem } from '@/types/database'

export type TripBoardStatus = 'to_plan' | 'planned' | 'been' | 'shared' | 'someday'

export type TripBoardFilter = 'all' | 'boards' | 'trips' | 'shared'

export function tripPlaceCount(itineraryId: string, items: SavedItem[]): number {
  return items.filter((i) => i.itinerary_id === itineraryId).length
}

export function tripPlaces(itineraryId: string, items: SavedItem[]): SavedItem[] {
  return items.filter((i) => i.itinerary_id === itineraryId)
}

/** Most common city/country from places on the board. */
export function tripLocationHint(places: SavedItem[]): string | null {
  const cityCounts = new Map<string, number>()
  const countryCounts = new Map<string, number>()
  for (const p of places) {
    const city = p.location_city?.trim()
    const country = p.location_country?.trim()
    if (city) cityCounts.set(city, (cityCounts.get(city) || 0) + 1)
    if (country) countryCounts.set(country, (countryCounts.get(country) || 0) + 1)
  }
  const topCity = [...cityCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0]
  const topCountry = [...countryCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0]
  if (topCity && topCountry) return `${topCity}, ${topCountry}`
  return topCity || topCountry || null
}

export function tripCoverUrl(itinerary: Itinerary, places: SavedItem[]): string | null {
  return (
    itinerary.cover_image_url ||
    places[0]?.screenshot_url ||
    places[0]?.thumbnail_url ||
    null
  )
}

/** Up to 4 thumbnail URLs for a collage strip (cover first, then place images). */
export function tripThumbnails(itinerary: Itinerary, places: SavedItem[], limit = 4): string[] {
  const urls: string[] = []
  const seen = new Set<string>()
  const push = (url: string | null | undefined) => {
    if (!url || seen.has(url)) return
    seen.add(url)
    urls.push(url)
  }
  push(itinerary.cover_image_url)
  for (const p of places) {
    push(p.screenshot_url)
    push(p.thumbnail_url)
    if (urls.length >= limit) break
  }
  return urls.slice(0, limit)
}

function parseDay(dateStr: string): Date {
  // Dates are stored as YYYY-MM-DD; parse as local noon to avoid TZ edge cases
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, (m || 1) - 1, d || 1, 12, 0, 0)
}

export function tripStatus(itinerary: Itinerary): TripBoardStatus {
  const today = new Date()
  today.setHours(12, 0, 0, 0)

  if (itinerary.end_date) {
    const end = parseDay(itinerary.end_date)
    if (end < today) return 'been'
  }
  if (itinerary.start_date || itinerary.end_date) return 'planned'
  if (itinerary.published_at) return 'shared'
  return 'to_plan'
}

export function tripStatusMeta(status: TripBoardStatus): { label: string; className: string } {
  switch (status) {
    case 'been':
      return {
        label: 'Been',
        className: 'bg-[color:var(--status-success-bg)] text-[color:var(--status-success-fg)]',
      }
    case 'planned':
      return {
        label: 'Planned',
        className: 'bg-[color:var(--status-info-bg)] text-[color:var(--status-info-fg)]',
      }
    case 'shared':
      return {
        label: 'Shared',
        className: 'bg-sky-100 text-sky-700',
      }
    case 'someday':
      return {
        label: 'Someday',
        className: 'bg-[color:var(--bg-inset)] text-[color:var(--text-secondary)]',
      }
    default:
      return {
        label: 'To plan',
        className: 'bg-orchid-200 text-orchid-600',
      }
  }
}

export function formatTripDates(itinerary: Itinerary): string | null {
  if (!itinerary.start_date && !itinerary.end_date) return null
  const fmt = (s: string) =>
    parseDay(s).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
  const fmtYear = (s: string) =>
    parseDay(s).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
  if (itinerary.start_date && itinerary.end_date) {
    return `${fmt(itinerary.start_date)} – ${fmtYear(itinerary.end_date)}`
  }
  if (itinerary.start_date) return `From ${fmtYear(itinerary.start_date)}`
  return `Until ${fmtYear(itinerary.end_date!)}`
}

/** Boards = no dates; Trips = has dates; Shared = published. */
export function matchesTripFilter(itinerary: Itinerary, filter: TripBoardFilter): boolean {
  if (filter === 'all') return true
  if (filter === 'shared') return !!itinerary.published_at
  if (filter === 'trips') return !!(itinerary.start_date || itinerary.end_date)
  // boards: inspiration collections without dates
  return !itinerary.start_date && !itinerary.end_date
}

/** Featured: soonest upcoming trip, else most places, else most recently updated. */
export function pickFeaturedTrip(
  itineraries: Itinerary[],
  items: SavedItem[]
): Itinerary | null {
  if (itineraries.length === 0) return null
  const today = new Date()
  today.setHours(12, 0, 0, 0)

  const upcoming = itineraries
    .filter((t) => t.start_date && parseDay(t.start_date) >= today)
    .sort((a, b) => parseDay(a.start_date!).getTime() - parseDay(b.start_date!).getTime())
  if (upcoming[0]) return upcoming[0]

  const byPlaces = [...itineraries].sort(
    (a, b) => tripPlaceCount(b.id, items) - tripPlaceCount(a.id, items)
  )
  if (tripPlaceCount(byPlaces[0].id, items) > 0) return byPlaces[0]

  return [...itineraries].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  )[0]
}
