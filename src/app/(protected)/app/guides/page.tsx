import type { Metadata } from 'next'
import Link from 'next/link'
import GuideCardLink from '@/components/guides/GuideCardLink'
import {
  listGuideDestinations,
  listPublishedGuides,
} from '@/lib/travel-guides'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Travel Guides | FIBI',
  description: 'Destination guides from FIBI. Save places you love into your Travel Boards.',
}

export default async function AppGuidesHubPage() {
  const [featured, latest, destinations] = await Promise.all([
    listPublishedGuides({ featuredOnly: true, limit: 6 }),
    listPublishedGuides({ limit: 12 }),
    listGuideDestinations(),
  ])

  const featuredIds = new Set(featured.map((g) => g.id))
  const latestOnly = latest.filter((g) => !featuredIds.has(g.id)).slice(0, 8)
  const hubDestinations = destinations.filter((d) => d.count >= 2)

  return (
    <div className="min-h-screen bg-[color:var(--bg-page)] pb-20 md:pb-8">
      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-12">
        <section className="mb-10">
          <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-sky-600">
            Travel Guides
          </p>
          <h1 className="mt-2 max-w-2xl text-3xl font-semibold tracking-[-0.028em] text-[color:var(--text-primary)] sm:text-4xl">
            Places worth saving, organised by destination.
          </h1>
          <p className="mt-4 max-w-xl text-[color:var(--text-secondary)] leading-relaxed">
            Browse FIBI guides, then save what catches your eye straight into your own Travel Boards.
          </p>
        </section>

        {hubDestinations.length > 0 && (
          <section className="mb-12">
            <h2 className="mb-3 text-sm font-medium text-[color:var(--text-primary)]">
              Browse by destination
            </h2>
            <div className="flex flex-wrap gap-2">
              {hubDestinations.map((d) => (
                <Link
                  key={d.slug}
                  href={`/travel-guides/in/${d.slug}`}
                  className="rounded-full border border-[color:var(--border-subtle)] bg-white px-3.5 py-1.5 text-sm text-[color:var(--text-secondary)] transition-colors hover:border-sky-300 hover:text-sky-700"
                >
                  {d.label}
                </Link>
              ))}
            </div>
          </section>
        )}

        {featured.length > 0 && (
          <section className="mb-14">
            <h2 className="mb-6 text-xl font-semibold tracking-[-0.02em] text-[color:var(--text-primary)]">
              Featured
            </h2>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {featured.map((g) => (
                <GuideCardLink key={g.id} guide={g} basePath="/app/guides" />
              ))}
            </div>
          </section>
        )}

        <section>
          <h2 className="mb-6 text-xl font-semibold tracking-[-0.02em] text-[color:var(--text-primary)]">
            {featured.length > 0 ? 'Latest' : 'Guides'}
          </h2>
          {(featured.length > 0 ? latestOnly : latest).length === 0 && featured.length === 0 ? (
            <p className="text-[color:var(--text-secondary)]">
              No guides published yet. Check back soon.
            </p>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {(featured.length > 0 ? latestOnly : latest).map((g) => (
                <GuideCardLink key={g.id} guide={g} basePath="/app/guides" />
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  )
}
