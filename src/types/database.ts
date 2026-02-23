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
  created_at: string
  updated_at: string
}

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
  created_at: string
}

export interface ItineraryShare {
  id: string
  itinerary_id: string
  share_token: string
  created_at: string
  revoked_at: string | null
}

