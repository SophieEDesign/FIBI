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

  return (
    <Link
      href={`/travel-guides/${guide.slug}`}
      className={`group block ${className}`}
    >
      <div className="aspect-[4/3] overflow-hidden bg-gray-100 mb-4">
        {guide.cover_image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={guide.cover_image_url}
            alt=""
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
          />
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-gray-200 to-gray-100" />
        )}
      </div>
      <h3 className="text-lg font-medium text-fibi-text-primary group-hover:underline underline-offset-2 decoration-1">
        {guide.title}
      </h3>
      {guide.excerpt && (
        <p className="mt-2 text-sm text-fibi-muted leading-relaxed line-clamp-2">
          {guide.excerpt}
        </p>
      )}
      <p className="mt-2 text-xs text-fibi-muted">
        {[location, updated ? `Updated ${updated}` : null].filter(Boolean).join(' · ')}
      </p>
    </Link>
  )
}
