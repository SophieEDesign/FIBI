import type { MetadataRoute } from 'next'
import { createClient } from '@/lib/supabase/server'
import { destinationSlug, guideDestinationKey } from '@/lib/travel-guides'
import type { TravelGuide } from '@/types/database'

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
    {
      url: `${baseUrl}/travel-guides`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.85,
    },
  ]

  try {
    const supabase = await createClient()
    const { data: boards } = await supabase.rpc('list_published_board_slugs')

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

    const { data: guides } = await supabase
      .from('travel_guides')
      .select(
        'slug, published_at, updated_at, country, destination_name, status'
      )
      .eq('status', 'published')

    const typedGuides = (guides || []) as Pick<
      TravelGuide,
      'slug' | 'published_at' | 'updated_at' | 'country' | 'destination_name' | 'status'
    >[]

    const destCounts = new Map<string, { label: string; count: number; lastMod: Date }>()

    for (const guide of typedGuides) {
      if (!guide.slug) continue
      const lastMod = guide.updated_at
        ? new Date(guide.updated_at)
        : guide.published_at
          ? new Date(guide.published_at)
          : new Date()

      entries.push({
        url: `${baseUrl}/travel-guides/${guide.slug}`,
        lastModified: lastMod,
        changeFrequency: 'weekly',
        priority: 0.8,
      })

      const label = guideDestinationKey(guide)
      if (label) {
        const slug = destinationSlug(label)
        const existing = destCounts.get(slug)
        if (existing) {
          existing.count += 1
          if (lastMod > existing.lastMod) existing.lastMod = lastMod
        } else {
          destCounts.set(slug, { label, count: 1, lastMod })
        }
      }
    }

    for (const [slug, meta] of destCounts) {
      if (meta.count < 2) continue
      entries.push({
        url: `${baseUrl}/travel-guides/in/${slug}`,
        lastModified: meta.lastMod,
        changeFrequency: 'weekly',
        priority: 0.75,
      })
    }
  } catch (err) {
    console.error('Sitemap fetch failed:', err)
  }

  return entries
}
