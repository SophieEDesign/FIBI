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
  status: string | null
  notes: string | null
  planned_date: string | null
  created_at: string
  updated_at: string
}

export const CATEGORIES = ['Food', 'Stay', 'Nature', 'Activity', 'City', 'Beach', 'Other'] as const
export const STATUSES = ['Want', 'Dream', 'Maybe', 'Been'] as const

export type Category = typeof CATEGORIES[number]
export type Status = typeof STATUSES[number]

