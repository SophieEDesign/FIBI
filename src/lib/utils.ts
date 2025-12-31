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

