import SharedItineraryView from '@/components/SharedItineraryView'
import { createClient } from '@/lib/supabase/server'
import type { Metadata } from 'next'

export const dynamic = 'force-dynamic'

function getSiteUrl(): string {
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

export async function generateMetadata({
  params,
}: {
  params: Promise<{ token: string }>
}): Promise<Metadata> {
  const { token } = await params
  const siteUrl = getSiteUrl()

  try {
    const supabase = await createClient()
    
    // Find the active share
    const { data: share } = await supabase
      .from('itinerary_shares')
      .select('itinerary_id')
      .eq('share_token', token)
      .is('revoked_at', null)
      .single()

    if (share) {
      // Get the itinerary name
      const { data: itinerary } = await supabase
        .from('itineraries')
        .select('name')
        .eq('id', share.itinerary_id)
        .single()

      if (itinerary) {
        return {
          title: `${itinerary.name} - Shared Itinerary | FiBi`,
          description: `View this shared travel itinerary: ${itinerary.name}`,
          openGraph: {
            title: `${itinerary.name} - Shared Itinerary`,
            description: `View this shared travel itinerary: ${itinerary.name}`,
            type: 'website',
            url: `${siteUrl}/share/itinerary/${token}`,
            images: [
              {
                url: `${siteUrl}/hero-image.png`,
                width: 1200,
                height: 630,
                alt: `${itinerary.name} - Shared Itinerary`,
              },
            ],
          },
          twitter: {
            card: 'summary_large_image',
            title: `${itinerary.name} - Shared Itinerary`,
            description: `View this shared travel itinerary: ${itinerary.name}`,
            images: [`${siteUrl}/hero-image.png`],
          },
        }
      }
    }
  } catch (error) {
    console.error('Error generating metadata for shared itinerary:', error)
  }

  // Fallback metadata
  return {
    title: 'Shared Itinerary | FiBi',
    description: 'View this shared travel itinerary',
    openGraph: {
      title: 'Shared Itinerary | FiBi',
      description: 'View this shared travel itinerary',
      type: 'website',
      url: `${siteUrl}/share/itinerary/${token}`,
      images: [
        {
          url: `${siteUrl}/hero-image.png`,
          width: 1200,
          height: 630,
          alt: 'Shared Itinerary | FiBi',
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: 'Shared Itinerary | FiBi',
      description: 'View this shared travel itinerary',
      images: [`${siteUrl}/hero-image.png`],
    },
  }
}

export default async function SharedItineraryPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  return <SharedItineraryView shareToken={token} />
}

