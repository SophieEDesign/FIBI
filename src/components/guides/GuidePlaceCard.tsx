'use client'

import type { TravelGuidePlace } from '@/types/database'
import { sourceCtaLabel } from '@/lib/travel-guides'

interface GuidePlaceCardProps {
  place: TravelGuidePlace
  selected: boolean
  saving: boolean
  saved: boolean
  onSave: () => void
  onShowOnMap: () => void
}

export default function GuidePlaceCard({
  place,
  selected,
  saving,
  saved,
  onSave,
  onShowOnMap,
}: GuidePlaceCardProps) {
  const location = [place.location_city, place.location_country].filter(Boolean).join(', ')
  const hasCoords =
    place.latitude != null &&
    place.longitude != null &&
    !Number.isNaN(Number(place.latitude))

  return (
    <article
      id={`place-${place.id}`}
      className={`scroll-mt-24 py-8 border-b border-gray-100 last:border-0 ${
        selected ? 'bg-white/80 -mx-4 px-4 sm:-mx-6 sm:px-6 rounded-lg ring-1 ring-fibi-primary/20' : ''
      }`}
    >
      <div className="grid sm:grid-cols-[200px_1fr] gap-5 sm:gap-8">
        <div className="aspect-[4/3] sm:aspect-square overflow-hidden bg-gray-100">
          {place.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={place.image_url}
              alt={place.name}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="h-full w-full bg-gradient-to-br from-gray-200 to-gray-100" />
          )}
        </div>

        <div className="min-w-0 space-y-3">
          <div>
            <h3 className="text-xl font-medium text-fibi-text-primary">{place.name}</h3>
            {location && (
              <p className="mt-1 text-sm text-fibi-muted">{location}</p>
            )}
          </div>

          {place.description && (
            <p className="text-fibi-muted leading-relaxed">{place.description}</p>
          )}

          <div className="flex flex-wrap gap-3 pt-1">
            <button
              type="button"
              onClick={onSave}
              disabled={saving || saved}
              className="inline-flex items-center px-4 py-2 text-sm font-medium bg-fibi-text-primary text-white hover:opacity-90 disabled:opacity-60 transition-opacity"
            >
              {saved ? 'Saved' : saving ? 'Saving…' : 'Save to FIBI'}
            </button>

            {hasCoords && (
              <button
                type="button"
                onClick={onShowOnMap}
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-fibi-text-primary border border-gray-200 hover:border-gray-300"
              >
                Show on map
              </button>
            )}

            {place.source_url && (
              <a
                href={place.source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-fibi-muted hover:text-fibi-text-primary"
              >
                {sourceCtaLabel(place.source_platform)}
              </a>
            )}
          </div>
        </div>
      </div>
    </article>
  )
}
