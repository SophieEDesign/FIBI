export function detectPlatform(url: string): string {
  try {
    const hostname = new URL(url).hostname.toLowerCase()
    if (hostname.includes('tiktok.com')) return 'TikTok'
    if (hostname.includes('instagram.com')) return 'Instagram'
    if (hostname.includes('youtube.com') || hostname.includes('youtu.be')) return 'YouTube'
    return 'Other'
  } catch {
    return 'Other'
  }
}

export function getHostname(url: string): string {
  try {
    return new URL(url).hostname.replace('www.', '')
  } catch {
    return url
  }
}

/**
 * Clean Open Graph title by removing platform noise
 * Removes common patterns like "TikTok", "Instagram", "Watch this video", etc.
 */
export function cleanOGTitle(title: string | null | undefined): string | null {
  if (!title) return null
  
  let cleaned = title.trim()
  
  // Remove platform-specific prefixes/suffixes
  const platformPatterns = [
    /^TikTok\s*[-–—]\s*/i,
    /^Instagram\s*[-–—]\s*/i,
    /^YouTube\s*[-–—]\s*/i,
    /\s*[-–—]\s*TikTok$/i,
    /\s*[-–—]\s*Instagram$/i,
    /\s*[-–—]\s*YouTube$/i,
    /^Watch\s+this\s+video\s*[-–—:]\s*/i,
    /^Watch\s*[-–—:]\s*/i,
    /^Video\s*[-–—:]\s*/i,
  ]
  
  platformPatterns.forEach(pattern => {
    cleaned = cleaned.replace(pattern, '')
  })
  
  // Remove extra whitespace
  cleaned = cleaned.trim()
  
  return cleaned || null
}

/**
 * Generate a fallback title from hostname
 * e.g. "Place from tiktok.com"
 */
export function generateHostnameTitle(url: string): string {
  try {
    const hostname = getHostname(url)
    return `Place from ${hostname}`
  } catch {
    return 'Place from unknown source'
  }
}

/**
 * Google Places API response types
 */
export interface GooglePlace {
  place_id: string
  name: string
  formatted_address: string
  geometry: {
    location: {
      lat: number
      lng: number
    }
  }
  address_components: Array<{
    long_name: string
    short_name: string
    types: string[]
  }>
}

export interface GooglePlacesSearchResult {
  place: GooglePlace | null
  city: string | null
  country: string | null
}

/**
 * Search Google Places API for a location by text query
 * Returns place details if a confident match is found
 */
export async function searchGooglePlaces(
  query: string,
  apiKey?: string
): Promise<GooglePlacesSearchResult> {
  if (!apiKey || !query.trim()) {
    return { place: null, city: null, country: null }
  }

  try {
    // Use Google Places Text Search API
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&key=${apiKey}`
    )

    if (!response.ok) {
      console.warn('Google Places API request failed:', response.status)
      return { place: null, city: null, country: null }
    }

    const data = await response.json()

    // Only return if we have a confident result
    if (data.status === 'OK' && data.results && data.results.length > 0) {
      const firstResult = data.results[0]
      
      // Extract city and country from address components
      let city: string | null = null
      let country: string | null = null

      if (firstResult.address_components) {
        for (const component of firstResult.address_components) {
          if (component.types.includes('locality') || component.types.includes('administrative_area_level_1')) {
            city = component.long_name
          }
          if (component.types.includes('country')) {
            country = component.long_name
          }
        }
      }

      return {
        place: {
          place_id: firstResult.place_id,
          name: firstResult.name,
          formatted_address: firstResult.formatted_address,
          geometry: {
            location: {
              lat: firstResult.geometry.location.lat,
              lng: firstResult.geometry.location.lng,
            },
          },
          address_components: firstResult.address_components || [],
        },
        city,
        country,
      }
    }

    return { place: null, city: null, country: null }
  } catch (error) {
    console.warn('Error searching Google Places:', error)
    return { place: null, city: null, country: null }
  }
}

/**
 * Upload a screenshot image to Supabase Storage
 * @param file - The image file to upload
 * @param userId - The user's ID
 * @param itemId - The item's ID (optional, for existing items)
 * @param supabase - Supabase client instance
 * @returns Public URL of the uploaded image, or null if upload fails
 */
export async function uploadScreenshot(
  file: File,
  userId: string,
  itemId: string | null,
  supabase: ReturnType<typeof import('@/lib/supabase/client').createClient>
): Promise<string | null> {
  try {
    // Validate file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
    if (!validTypes.includes(file.type)) {
      throw new Error('Invalid file type. Please use JPG, PNG, or WebP.')
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024 // 5MB
    if (file.size > maxSize) {
      throw new Error('File size too large. Maximum size is 5MB.')
    }

    // Generate file path: screenshots/{userId}/{itemId or timestamp}.{ext}
    const fileExt = file.name.split('.').pop() || 'jpg'
    const fileName = itemId || `temp-${Date.now()}`
    const filePath = `${userId}/${fileName}.${fileExt}`

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from('screenshots')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true,
      })

    if (error) {
      // Provide helpful error message for missing bucket
      if (error.message?.includes('Bucket not found') || error.message?.includes('not found')) {
        throw new Error('Storage bucket "screenshots" not found. Please create it in your Supabase dashboard under Storage.')
      }
      throw error
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('screenshots')
      .getPublicUrl(filePath)

    return urlData.publicUrl
  } catch (error: any) {
    console.error('Error uploading screenshot:', error)
    // Re-throw with helpful message for bucket errors
    if (error.message?.includes('Bucket not found') || error.message?.includes('not found')) {
      throw new Error('Storage bucket "screenshots" not found. Please create it in your Supabase dashboard under Storage.')
    }
    throw error
  }
}

