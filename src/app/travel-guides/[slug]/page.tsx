import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import TravelGuideView from '@/components/guides/TravelGuideView'
import {
  destinationSlug,
  getPublishedGuideBySlug,
  getSiteUrl,
  guideDestinationKey,
  listGuideDestinations,
  listRelatedGuides,
} from '@/lib/travel-guides'

export const dynamic = 'force-dynamic'

async function load(slug: string) {
  return getPublishedGuideBySlug(slug)
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const siteUrl = getSiteUrl()
  const loaded = await load(slug)

  if (!loaded) {
    return {
      title: 'Travel Guide | FIBI',
      description: 'A FIBI travel guide',
      robots: { index: false },
    }
  }

  const { guide, places } = loaded
  const title = guide.seo_title?.trim() || `${guide.title} | FIBI`
  const description =
    guide.seo_description?.trim() ||
    guide.excerpt?.trim() ||
    guide.introduction?.trim()?.slice(0, 160) ||
    `${places.length} places worth saving on FIBI.`
  const image = guide.cover_image_url || `${siteUrl}/hero-image.png`
  const url = `${siteUrl}/travel-guides/${guide.slug}`

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title: guide.title,
      description,
      url,
      type: 'article',
      images: [{ url: image, width: 1200, height: 630, alt: guide.title }],
    },
    twitter: {
      card: 'summary_large_image',
      title: guide.title,
      description,
      images: [image],
    },
  }
}

export default async function TravelGuidePage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const loaded = await load(slug)
  if (!loaded) notFound()

  const { guide, places } = loaded
  const related = await listRelatedGuides(guide, 4)
  const destinations = await listGuideDestinations()
  const destKey = guideDestinationKey(guide)
  const destSlug = destKey ? destinationSlug(destKey) : null
  const hub =
    destSlug && destinations.some((d) => d.slug === destSlug && d.count >= 2)
      ? destSlug
      : null

  const siteUrl = getSiteUrl()
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: guide.title,
    description: guide.excerpt || guide.introduction || undefined,
    image: guide.cover_image_url || undefined,
    datePublished: guide.published_at || undefined,
    dateModified: guide.updated_at || undefined,
    author: {
      '@type': 'Organization',
      name: guide.author_name || 'FIBI',
    },
    publisher: {
      '@type': 'Organization',
      name: 'FIBI',
      url: siteUrl,
    },
    mainEntityOfPage: `${siteUrl}/travel-guides/${guide.slug}`,
  }

  const breadcrumbLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Travel Guides',
        item: `${siteUrl}/travel-guides`,
      },
      ...(hub && destKey
        ? [
            {
              '@type': 'ListItem',
              position: 2,
              name: destKey,
              item: `${siteUrl}/travel-guides/in/${hub}`,
            },
            {
              '@type': 'ListItem',
              position: 3,
              name: guide.title,
              item: `${siteUrl}/travel-guides/${guide.slug}`,
            },
          ]
        : [
            {
              '@type': 'ListItem',
              position: 2,
              name: guide.title,
              item: `${siteUrl}/travel-guides/${guide.slug}`,
            },
          ]),
    ],
  }

  const destinationLd =
    guide.country || guide.city || guide.destination_name
      ? {
          '@context': 'https://schema.org',
          '@type': 'TouristDestination',
          name: guide.destination_name || guide.city || guide.country,
          address: {
            '@type': 'PostalAddress',
            addressLocality: guide.city || undefined,
            addressRegion: guide.region || undefined,
            addressCountry: guide.country || undefined,
          },
        }
      : null

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />
      {destinationLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(destinationLd) }}
        />
      )}
      <TravelGuideView
        guide={guide}
        places={places}
        related={related}
        destinationHubSlug={hub}
      />
    </>
  )
}
