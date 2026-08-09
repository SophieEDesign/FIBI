'use client'

import type { TravelGuidePlace } from '@/types/database'
import { sourceCtaLabel, videoCtaLabel } from '@/lib/travel-guides-shared'
import { Button } from '@/components/ui/Button'

interface GuidePlaceCardProps {
  place: TravelGuidePlace
  index: number
  selected: boolean
  saving: boolean
  saved: boolean
  onSave: () => void
  onShowOnMap: () => void
  /** Larger tile for the first place in a section */
  featured?: boolean
}

export default function GuidePlaceCard({
  place,
  index,
  selected,
  saving,
  saved,
  onSave,
  onShowOnMap,
  featured = false,
}: GuidePlaceCardProps) {
  const location = [place.location_city, place.location_country].filter(Boolean).join(', ')
  const hasCoords =
    place.latitude != null &&
    place.longitude != null &&
    !Number.isNaN(Number(place.latitude))

  const videoUrl = place.video_url?.trim() || null
  const sourceIsVideo =
    !videoUrl &&
    !!place.source_url &&
    /tiktok|instagram|youtube|youtu\.be/i.test(
      `${place.source_platform || ''} ${place.source_url || ''}`
    )
  const effectiveVideoUrl = videoUrl || (sourceIsVideo ? place.source_url : null)
  const referenceUrl =
    place.source_url && place.source_url !== effectiveVideoUrl ? place.source_url : null

  const platform = (
    effectiveVideoUrl ? place.source_platform || 'TikTok' : place.source_platform
  )?.trim()

  const rawDescription = place.description || ''
  const categoryMatch = rawDescription.match(/FIBI category:\s*(.+)$/im)
  const goodForMatch = rawDescription.match(/Good for:\s*(.+)$/im)
  const category = categoryMatch?.[1]?.trim() || null
  const goodForTags =
    goodForMatch?.[1]
      ?.split(/[·|,]/)
      .map((t) => t.trim())
      .filter(Boolean) || []
  const bodyCopy = rawDescription
    .replace(/\n*Good for:.*$/im, '')
    .replace(/\n*FIBI category:.*$/im, '')
    .trim()

  return (
    <article
      id={`place-${place.id}`}
      className={`group relative scroll-mt-28 overflow-hidden rounded-2xl border border-[color:var(--border-subtle)] bg-white shadow-soft transition-[box-shadow,transform,ring] duration-base ease-out hover:-translate-y-0.5 hover:shadow-soft-md ${
        selected ? 'ring-2 ring-sky-400/50' : ''
      } ${featured ? 'sm:col-span-2' : ''}`}
    >
      <div
        className={`relative overflow-hidden bg-[color:var(--bg-inset)] ${
          featured ? 'aspect-[16/10] sm:aspect-[2.2/1]' : 'aspect-[4/5] sm:aspect-[5/6]'
        }`}
      >
        {place.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={place.image_url}
            alt={place.name}
            className="h-full w-full object-cover transition-transform duration-slow ease-out group-hover:scale-[1.04]"
          />
        ) : (
          <div className="h-full w-full bg-fibi-brand-soft" />
        )}

        {/* Bottom scrim for title readability */}
        <div
          className="pointer-events-none absolute inset-0 bg-gradient-to-t from-indigo-950/80 via-indigo-950/25 to-transparent"
          aria-hidden
        />

        {/* Number badge */}
        <div className="absolute left-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-fibi-gradient text-sm font-semibold text-indigo-900 shadow-soft">
          {String(index).padStart(2, '0')}
        </div>

        {platform && (
          <span className="absolute right-3 top-3 z-10 rounded-full border border-white/20 bg-white/15 px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.08em] text-white backdrop-blur-md">
            {platform.replace(/_/g, ' ')}
          </span>
        )}

        <div className="absolute inset-x-0 bottom-0 z-10 p-4 sm:p-5">
          <h3
            className={`font-semibold tracking-[-0.02em] text-white ${
              featured ? 'text-2xl sm:text-3xl' : 'text-xl sm:text-2xl'
            }`}
          >
            {place.name}
          </h3>
          {location && (
            <p className="mt-1 text-sm text-white/75">{location}</p>
          )}
        </div>
      </div>

      <div className="space-y-4 p-4 sm:p-5">
        {(category || goodForTags.length > 0) && (
          <div className="flex flex-wrap gap-1.5">
            {category && (
              <span className="rounded-full bg-fibi-gradient px-2.5 py-1 text-[11px] font-medium text-indigo-900">
                {category}
              </span>
            )}
            {goodForTags.map((tag) => (
              <span
                key={tag}
                className="rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 text-[11px] font-medium text-sky-700"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {bodyCopy && (
          <p className="text-[15px] leading-relaxed text-[color:var(--text-secondary)] line-clamp-3 whitespace-pre-line">
            {bodyCopy}
          </p>
        )}

        <div className="flex flex-wrap gap-2">
          {effectiveVideoUrl && (
            <Button href={effectiveVideoUrl} variant="secondary" size="sm">
              {videoCtaLabel(place.source_platform)}
            </Button>
          )}

          {referenceUrl && !effectiveVideoUrl && (
            <Button href={referenceUrl} variant="ghost" size="sm">
              {sourceCtaLabel(place.source_platform)}
            </Button>
          )}

          {referenceUrl && effectiveVideoUrl && (
            <Button href={referenceUrl} variant="ghost" size="sm">
              Read more
            </Button>
          )}

          {hasCoords && (
            <Button type="button" variant="soft" size="sm" onClick={onShowOnMap}>
              See on map
            </Button>
          )}

          <Button
            type="button"
            variant={saved ? 'soft' : 'primary'}
            size="sm"
            onClick={onSave}
            disabled={saving || saved}
          >
            {saved ? 'Saved' : saving ? 'Saving…' : 'Save place'}
          </Button>
        </div>
      </div>
    </article>
  )
}
