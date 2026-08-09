import type { MetadataRoute } from 'next'
import { createClient } from '@/lib/supabase/server'

function getBaseUrl(): string {
  if (typeof process !== 'undefined') {
    if (process.env.NEXT_PUBLIC_SITE_URL) {
      return process.env.NEXT_PUBLIC_SITE_URL
    }
    if (process.env.VERCEL_URL) {
      return `https://${process.env.VERCEL_URL}`
    }
  }
  return 'https://fibi.world'
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = getBaseUrl()
  const entries: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 1,
    },
  ]

  try {
    const supabase = await createClient()
    const { data: boards } = await supabase
      .from('itineraries')
      .select('public_slug, published_at')
      .not('published_at', 'is', null)
      .not('public_slug', 'is', null)
      .order('published_at', { ascending: false })
      .limit(500)

    if (boards) {
      for (const board of boards) {
        if (!board.public_slug) continue
        entries.push({
          url: `${baseUrl}/board/${board.public_slug}`,
          lastModified: board.published_at
            ? new Date(board.published_at)
            : new Date(),
          changeFrequency: 'weekly',
          priority: 0.7,
        })
      }
    }
  } catch (err) {
    console.error('Sitemap board fetch failed:', err)
  }

  return entries
}
