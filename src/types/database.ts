export interface SavedItem {
  id: string
  user_id: string
  url: string
  platform: string
  title: string | null
  description: string | null
  thumbnail_url: string | null
  screenshot_url: string | null
  location_country: string | null
  location_city: string | null
  place_name: string | null
  place_id: string | null
  latitude: number | null
  longitude: number | null
  formatted_address: string | null
  category: string | null
  status?: string | null // deprecated - kept for DB compatibility
  liked?: boolean
  visited?: boolean
  planned?: boolean
  notes: string | null
  planned_date: string | null
  itinerary_id: string | null
  trip_position: number | null
  /** resolved | needs_review | unknown */
  location_status?: 'resolved' | 'needs_review' | 'unknown' | null
  created_at: string
  updated_at: string
}

export type LocationStatus = 'resolved' | 'needs_review' | 'unknown'

export const CATEGORIES = ['Food', 'Stay', 'Nature', 'Activity', 'City', 'Beach', 'Other'] as const

export type Category = typeof CATEGORIES[number]

export interface Itinerary {
  id: string
  user_id: string
  name: string
  start_date: string | null
  end_date: string | null
  cover_image_url?: string | null
  notes?: string | null
  /** Shown on shareable boards; separate from private notes */
  public_description?: string | null
  published_at?: string | null
  public_slug?: string | null
  created_at: string
}

export interface ItineraryShare {
  id: string
  itinerary_id: string
  share_token: string
  share_type?: 'link_view' | 'copy' | 'collaborate'
  created_at: string
  revoked_at: string | null
}

/** Collaborator on an itinerary (owner is in itineraries.user_id). */
export interface ItineraryCollaborator {
  id: string
  itinerary_id: string
  user_id: string | null
  invited_email: string | null
  invited_at: string
  joined_at: string | null
  invited_by: string
  role: 'owner' | 'collaborator'
}

/** Public editorial Travel Guide (acquisition content — not a user Travel Board). */
export type TravelGuideStatus = 'draft' | 'published' | 'archived'

export interface TravelGuide {
  id: string
  title: string
  slug: string
  excerpt: string | null
  introduction: string | null
  destination_name: string | null
  city: string | null
  region: string | null
  country: string | null
  cover_image_url: string | null
  seo_title: string | null
  seo_description: string | null
  status: TravelGuideStatus
  featured: boolean
  author_name: string
  published_at: string | null
  created_at: string
  updated_at: string
}

/** Place row on a public Travel Guide (editorial — not a private saved_item). */
export interface TravelGuidePlace {
  id: string
  guide_id: string
  name: string
  description: string | null
  section: string | null
  display_order: number
  latitude: number | null
  longitude: number | null
  formatted_address: string | null
  location_city: string | null
  location_country: string | null
  place_id: string | null
  source_url: string | null
  source_platform: string | null
  /** Original TikTok / Instagram / YouTube URL when available (link out — do not rehost). */
  video_url: string | null
  image_url: string | null
  created_at: string
  updated_at: string
}

