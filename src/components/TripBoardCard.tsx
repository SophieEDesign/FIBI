'use client'

import type { Itinerary, SavedItem } from '@/types/database'
import { getProxiedImageUrl } from '@/lib/image-proxy'
import {
  formatTripDates,
  tripCoverUrl,
  tripLocationHint,
  tripPlaces,
  tripStatus,
  tripStatusMeta,
  tripThumbnails,
} from '@/lib/trip-board-meta'

interface TripBoardCardProps {
  itinerary: Itinerary
  items: SavedItem[]
  onOpen: () => void
  /** Large featured layout with description + thumbnail strip */
  featured?: boolean
}

export default function TripBoardCard({
  itinerary,
  items,
  onOpen,
  featured = false,
}: TripBoardCardProps) {
  const places = tripPlaces(itinerary.id, items)
  const coverUrl = tripCoverUrl(itinerary, places)
  const thumbs = tripThumbnails(itinerary, places, 4)
  const location = tripLocationHint(places)
  const status = tripStatusMeta(tripStatus(itinerary))
  const dates = formatTripDates(itinerary)
  const placeCount = places.length
  const description =
    itinerary.public_description?.trim() || itinerary.notes?.trim() || null
  const proxiedCover = coverUrl ? getProxiedImageUrl(coverUrl) || coverUrl : null

  if (featured) {
    return (
      <article className="overflow-hidden rounded-[22px] border border-[color:var(--border-subtle)] bg-white shadow-soft transition-[box-shadow,transform] duration-base ease-out md:hover:-translate-y-0.5 md:hover:shadow-soft-md">
        <button type="button" onClick={onOpen} className="block w-full text-left">
          <div className="relative aspect-[16/9] overflow-hidden bg-fibi-brand-soft sm:aspect-[2.2/1]">
            {proxiedCover ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={proxiedCover}
                alt=""
                className="absolute inset-0 h-full w-full object-cover"
              />
            ) : null}
            <div
              className="absolute inset-0 bg-gradient-to-t from-indigo-950/55 via-indigo-950/10 to-transparent"
              aria-hidden
            />
            <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full border border-white/30 bg-[color:var(--surface-glass)] px-2.5 py-1 text-[11px] font-medium text-charcoal backdrop-blur-[18px] backdrop-saturate-150">
              <svg
                className="h-3 w-3 text-gold-500"
                viewBox="0 0 24 24"
                fill="currentColor"
                aria-hidden
              >
                <path d="M12 2.5l2.6 6.3 6.9.6-5.2 4.5 1.6 6.7L12 16.9 6.1 20.6l1.6-6.7L2.5 9.4l6.9-.6L12 2.5z" />
              </svg>
              Featured
            </span>
          </div>

          <div className="space-y-3 p-4 sm:p-5">
            <div>
              <h3 className="text-xl font-semibold tracking-[-0.02em] text-charcoal sm:text-2xl">
                {itinerary.name}
              </h3>
              {location && (
                <p className="mt-1.5 flex items-center gap-1 text-sm text-[color:var(--text-tertiary)]">
                  <PinIcon />
                  <span className="truncate">{location}</span>
                </p>
              )}
            </div>

            {description && (
              <p className="line-clamp-2 text-[15px] leading-relaxed text-[color:var(--text-secondary)]">
                {description}
              </p>
            )}

            {thumbs.length > 1 && (
              <div className="flex gap-1.5">
                {thumbs.map((url) => {
                  const src = getProxiedImageUrl(url) || url
                  return (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      key={url}
                      src={src}
                      alt=""
                      className="h-12 w-12 rounded-lg object-cover sm:h-14 sm:w-14"
                    />
                  )
                })}
              </div>
            )}

            <div className="flex flex-wrap items-center gap-x-3 gap-y-2 pt-1">
              <span className="inline-flex items-center gap-1.5 text-xs text-[color:var(--text-secondary)]">
                <BookmarkIcon />
                {placeCount === 0
                  ? 'No places yet'
                  : `${placeCount} place${placeCount === 1 ? '' : 's'}`}
              </span>
              {dates && (
                <span className="inline-flex items-center gap-1.5 text-xs text-[color:var(--text-secondary)]">
                  <CalendarIcon />
                  {dates}
                </span>
              )}
              <span
                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium ${status.className}`}
              >
                {status.label}
              </span>
              <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-accent px-3.5 py-1.5 text-xs font-medium text-white">
                Open board
                <span aria-hidden>›</span>
              </span>
            </div>
          </div>
        </button>
      </article>
    )
  }

  return (
    <article className="group overflow-hidden rounded-[22px] border border-[color:var(--border-subtle)] bg-white shadow-soft transition-[box-shadow,transform] duration-base ease-out md:hover:-translate-y-0.5 md:hover:shadow-soft-md">
      <button type="button" onClick={onOpen} className="flex h-full w-full flex-col text-left">
        <div className="relative aspect-[4/3] overflow-hidden bg-fibi-brand-soft">
          {proxiedCover ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={proxiedCover}
              alt=""
              className="absolute inset-0 h-full w-full object-cover transition-transform duration-slow ease-out md:group-hover:scale-[1.03]"
            />
          ) : null}
          <div
            className="absolute inset-0 bg-gradient-to-t from-indigo-950/35 via-transparent to-transparent"
            aria-hidden
          />
        </div>
        <div className="flex flex-1 flex-col gap-1.5 p-3.5 sm:p-4">
          <h3 className="truncate text-[15px] font-semibold tracking-[-0.018em] text-charcoal sm:text-base">
            {itinerary.name}
          </h3>
          {location && (
            <p className="flex items-center gap-1 truncate text-xs text-[color:var(--text-tertiary)]">
              <PinIcon />
              <span className="truncate">{location}</span>
            </p>
          )}
          <div className="mt-auto flex items-center justify-between gap-2 pt-1">
            <span className="inline-flex items-center gap-1 text-[11px] text-[color:var(--text-secondary)]">
              <BookmarkIcon />
              {placeCount === 0 ? 'Empty' : placeCount}
            </span>
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium ${status.className}`}
            >
              {status.label}
            </span>
          </div>
        </div>
      </button>
    </article>
  )
}

function PinIcon() {
  return (
    <svg
      className="h-3 w-3 shrink-0"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      viewBox="0 0 24 24"
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11Z"
      />
      <circle cx="12" cy="10" r="2.5" />
    </svg>
  )
}

function BookmarkIcon() {
  return (
    <svg
      className="h-3.5 w-3.5 shrink-0"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      viewBox="0 0 24 24"
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M6 4h12a1 1 0 011 1v15l-7-4-7 4V5a1 1 0 011-1z"
      />
    </svg>
  )
}

function CalendarIcon() {
  return (
    <svg
      className="h-3.5 w-3.5 shrink-0"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      viewBox="0 0 24 24"
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
      />
    </svg>
  )
}
