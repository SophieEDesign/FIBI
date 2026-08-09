import type { Metadata } from 'next'
import Link from 'next/link'
import SiteFooter from '@/components/SiteFooter'
import GuideCardLink from '@/components/guides/GuideCardLink'
import {
  getSiteUrl,
  listGuideDestinations,
  listPublishedGuides,
} from '@/lib/travel-guides'

export const dynamic = 'force-dynamic'

export async function generateMetadata(): Promise<Metadata> {
  const siteUrl = getSiteUrl()
  const title = 'Travel Guides | FIBI'
  const description =
    'Destination guides from FIBI. Save the places you love straight into your own Travel Boards.'

  return {
    title,
    description,
    alternates: { canonical: `${siteUrl}/travel-guides` },
    openGraph: {
      title,
      description,
      url: `${siteUrl}/travel-guides`,
      type: 'website',
      images: [{ url: `${siteUrl}/hero-image.png`, width: 1200, height: 630, alt: 'FIBI' }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [`${siteUrl}/hero-image.png`],
    },
  }
}

export default async function TravelGuidesHubPage() {
  const [featured, latest, destinations] = await Promise.all([
    listPublishedGuides({ featuredOnly: true, limit: 6 }),
    listPublishedGuides({ limit: 12 }),
    listGuideDestinations(),
  ])

  const featuredIds = new Set(featured.map((g) => g.id))
  const latestOnly = latest.filter((g) => !featuredIds.has(g.id)).slice(0, 8)
  const hubDestinations = destinations.filter((d) => d.count >= 2)

  return (
    <div className="min-h-screen bg-fibi-bg-light flex flex-col">
      <header className="bg-white/90 border-b border-gray-100 sticky top-0 z-10 backdrop-blur-sm">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="text-xl font-semibold text-fibi-text-primary">
            FIBI
          </Link>
          <Link href="/add" className="text-sm font-medium text-fibi-muted hover:text-fibi-text-primary">
            Save a place
          </Link>
        </div>
      </header>

      <main className="flex-1">
        <section className="max-w-5xl mx-auto px-4 pt-12 pb-8 sm:pt-16">
          <p className="text-sm text-fibi-muted mb-2">Travel Guides</p>
          <h1 className="text-3xl sm:text-4xl font-medium text-fibi-text-primary max-w-2xl leading-tight">
            Places worth saving, organised by destination.
          </h1>
          <p className="mt-4 text-fibi-muted max-w-xl leading-relaxed">
            Editorial guides from FIBI. Read them without an account, then save what you love into
            your own Travel Boards.
          </p>
        </section>

        {hubDestinations.length > 0 && (
          <section className="max-w-5xl mx-auto px-4 pb-10">
            <h2 className="text-sm font-medium text-fibi-text-primary mb-3">Browse by destination</h2>
            <div className="flex flex-wrap gap-2">
              {hubDestinations.map((d) => (
                <Link
                  key={d.slug}
                  href={`/travel-guides/in/${d.slug}`}
                  className="px-3 py-1.5 text-sm border border-gray-200 text-fibi-muted hover:text-fibi-text-primary hover:border-gray-300"
                >
                  {d.label}
                </Link>
              ))}
            </div>
          </section>
        )}

        {featured.length > 0 && (
          <section className="max-w-5xl mx-auto px-4 py-10 border-t border-gray-100">
            <h2 className="text-xl font-medium text-fibi-text-primary mb-8">Featured</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-10">
              {featured.map((g) => (
                <GuideCardLink key={g.id} guide={g} />
              ))}
            </div>
          </section>
        )}

        <section className="max-w-5xl mx-auto px-4 py-10 border-t border-gray-100 pb-16">
          <h2 className="text-xl font-medium text-fibi-text-primary mb-8">
            {featured.length > 0 ? 'Latest' : 'Guides'}
          </h2>
          {(featured.length > 0 ? latestOnly : latest).length === 0 && featured.length === 0 ? (
            <p className="text-fibi-muted">
              No guides published yet. Check back soon.
            </p>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-10">
              {(featured.length > 0 ? latestOnly : latest).map((g) => (
                <GuideCardLink key={g.id} guide={g} />
              ))}
            </div>
          )}
        </section>
      </main>

      <SiteFooter />
    </div>
  )
}
