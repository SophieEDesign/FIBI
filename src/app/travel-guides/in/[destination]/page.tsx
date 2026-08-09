import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import SiteFooter from '@/components/SiteFooter'
import GuideCardLink from '@/components/guides/GuideCardLink'
import { getDestinationHub, getSiteUrl } from '@/lib/travel-guides'

export const dynamic = 'force-dynamic'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ destination: string }>
}): Promise<Metadata> {
  const { destination } = await params
  const siteUrl = getSiteUrl()
  const hub = await getDestinationHub(destination)

  if (!hub) {
    return {
      title: 'Travel Guides | FIBI',
      robots: { index: false },
    }
  }

  const title = `Travel Guides: ${hub.label} | FIBI`
  const description = `FIBI travel guides for ${hub.label}. Save places into your own Travel Boards.`
  const url = `${siteUrl}/travel-guides/in/${hub.slug}`

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      type: 'website',
      images: [{ url: `${siteUrl}/hero-image.png`, width: 1200, height: 630, alt: hub.label }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [`${siteUrl}/hero-image.png`],
    },
  }
}

export default async function DestinationGuidesPage({
  params,
}: {
  params: Promise<{ destination: string }>
}) {
  const { destination } = await params
  const hub = await getDestinationHub(destination)
  if (!hub) notFound()

  const siteUrl = getSiteUrl()
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
      {
        '@type': 'ListItem',
        position: 2,
        name: hub.label,
        item: `${siteUrl}/travel-guides/in/${hub.slug}`,
      },
    ],
  }

  return (
    <div className="min-h-screen bg-fibi-bg-light flex flex-col">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />
      <header className="bg-white/90 border-b border-gray-100 sticky top-0 z-10 backdrop-blur-sm">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="text-xl font-semibold text-fibi-text-primary">
            FIBI
          </Link>
          <Link
            href="/travel-guides"
            className="text-sm font-medium text-fibi-muted hover:text-fibi-text-primary"
          >
            All guides
          </Link>
        </div>
      </header>

      <main className="flex-1 max-w-5xl mx-auto px-4 pt-12 pb-16 w-full">
        <nav className="text-xs text-fibi-muted mb-4" aria-label="Breadcrumb">
          <Link href="/travel-guides" className="hover:text-fibi-text-primary">
            Travel Guides
          </Link>
          <span aria-hidden> / </span>
          <span className="text-fibi-text-primary">{hub.label}</span>
        </nav>

        <h1 className="text-3xl sm:text-4xl font-medium text-fibi-text-primary">
          Guides for {hub.label}
        </h1>
        <p className="mt-3 text-fibi-muted max-w-xl leading-relaxed">
          {hub.guides.length} guides. Save places into your own Travel Boards whenever you are ready.
        </p>

        <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-3 gap-10">
          {hub.guides.map((g) => (
            <GuideCardLink key={g.id} guide={g} />
          ))}
        </div>
      </main>

      <SiteFooter />
    </div>
  )
}
