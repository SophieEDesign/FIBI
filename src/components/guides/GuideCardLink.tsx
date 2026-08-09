'use client'

import Link from 'next/link'
import type { GuideCard } from '@/lib/travel-guides-shared'
import { formatGuideDate } from '@/lib/travel-guides-shared'

interface GuideCardLinkProps {
  guide: GuideCard
  className?: string
}

export default function GuideCardLink({ guide, className = '' }: GuideCardLinkProps) {
  const location = [guide.destination_name || guide.city, guide.country]
    .filter(Boolean)
    .join(', ')
  const updated = formatGuideDate(guide.updated_at || guide.published_at)
  const placeCount = guide.place_count

  return (
    <Link
      href={`/travel-guides/${guide.slug}`}
      className={`group relative block overflow-hidden rounded-2xl border border-[color:var(--border-subtle)] bg-white shadow-soft transition-[transform,box-shadow] duration-base ease-out hover:-translate-y-0.5 hover:shadow-soft-md ${className}`}
    >
      <div className="relative aspect-[4/5] overflow-hidden bg-[color:var(--bg-inset)] sm:aspect-[5/6]">
        {guide.cover_image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={guide.cover_image_url}
            alt=""
            className="h-full w-full object-cover transition-transform duration-slow ease-out group-hover:scale-[1.05]"
          />
        ) : (
          <div className="h-full w-full bg-fibi-brand-soft" />
        )}
        <div
          className="pointer-events-none absolute inset-0 bg-gradient-to-t from-indigo-950/85 via-indigo-950/30 to-transparent"
          aria-hidden
        />
        <div className="absolute inset-x-0 bottom-0 p-5">
          {(location || placeCount != null) && (
            <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.1em] text-white/70">
              {[
                location,
                placeCount != null
                  ? `${placeCount} place${placeCount === 1 ? '' : 's'}`
                  : null,
              ]
                .filter(Boolean)
                .join(' · ')}
            </p>
          )}
          <h3 className="text-xl font-semibold tracking-[-0.02em] text-white">
            {guide.title}
          </h3>
          {updated && (
            <p className="mt-2 text-xs text-white/55">Updated {updated}</p>
          )}
        </div>
      </div>
    </Link>
  )
}
