'use client'

import Link from 'next/link'
import type { SavedItem } from '@/types/database'
import { getHostname } from '@/lib/utils'
import { getProxiedImageUrl } from '@/lib/image-proxy'
import EmbedPreview from '@/components/EmbedPreview'

interface SavedPlaceCardProps {
  item: SavedItem
  category?: string | null
  failedScreenshot?: boolean
  onScreenshotError?: () => void
  onToggleLiked: () => void
  onTogglePlanned: () => void
  onAddToTrip: (e: React.MouseEvent) => void
}

function platformDotColor(platform: string | null | undefined): string {
  const p = (platform || '').toLowerCase()
  if (p.includes('tiktok')) return 'bg-orchid-400'
  if (p.includes('instagram')) return 'bg-gold-500'
  if (p.includes('youtube')) return 'bg-red-500'
  if (p.includes('facebook')) return 'bg-sky-500'
  return 'bg-sky-500'
}

function platformLabel(platform: string | null | undefined): string {
  const raw = (platform || '').trim()
  if (!raw) return 'Link'
  return raw.replace(/_/g, ' ')
}

function statusMeta(item: SavedItem): { label: string; className: string } {
  if (item.visited) {
    return {
      label: 'Been',
      className: 'bg-[color:var(--status-success-bg)] text-[color:var(--status-success-fg)]',
    }
  }
  if (item.planned) {
    return {
      label: 'Planned',
      className: 'bg-[color:var(--status-info-bg)] text-[color:var(--status-info-fg)]',
    }
  }
  if (item.liked) {
    return {
      label: 'Liked',
      className: 'bg-gold-200 text-[color:var(--status-warn-fg)]',
    }
  }
  return {
    label: 'To plan',
    className: 'bg-orchid-200 text-orchid-600',
  }
}

export default function SavedPlaceCard({
  item,
  category,
  failedScreenshot = false,
  onScreenshotError,
  onToggleLiked,
  onTogglePlanned,
  onAddToTrip,
}: SavedPlaceCardProps) {
  const displayTitle = item.title || item.place_name || getHostname(item.url)
  const locationLine =
    [item.location_city, item.location_country].filter(Boolean).join(', ') ||
    item.place_name ||
    item.formatted_address ||
    null
  const status = statusMeta(item)
  const isLiked = item.liked ?? false
  const isPlanned = item.planned ?? false

  return (
    <article className="group relative flex flex-col overflow-hidden rounded-[22px] border border-[color:var(--border-subtle)] bg-white shadow-soft transition-[box-shadow,transform] duration-base ease-out hover:-translate-y-0.5 hover:shadow-soft-md">
      <Link href={`/item/${item.id}`} className="relative block aspect-[4/5] overflow-hidden bg-[color:var(--bg-inset)]">
        {item.screenshot_url && !failedScreenshot ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.screenshot_url}
            alt=""
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-slow ease-out group-hover:scale-[1.03]"
            loading="lazy"
            onError={onScreenshotError}
          />
        ) : item.thumbnail_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={getProxiedImageUrl(item.thumbnail_url) || item.thumbnail_url}
            alt=""
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-slow ease-out group-hover:scale-[1.03]"
            loading="lazy"
          />
        ) : (
          <div className="absolute inset-0 bg-fibi-brand-soft">
            <EmbedPreview
              url={item.url}
              thumbnailUrl={item.thumbnail_url}
              platform={item.platform}
              displayTitle={displayTitle}
            />
          </div>
        )}

        {/* Soft bottom scrim */}
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-indigo-950/20 to-transparent"
          aria-hidden
        />

        <span className="absolute left-2.5 top-2.5 z-10 inline-flex items-center gap-1.5 rounded-full border border-white/40 bg-[color:var(--surface-glass)] px-2.5 py-1 text-[11px] font-medium text-[color:var(--text-primary)] backdrop-blur-[18px] backdrop-saturate-150">
          <span
            className={`h-1.5 w-1.5 shrink-0 rounded-full ${platformDotColor(item.platform)}`}
            aria-hidden
          />
          {platformLabel(item.platform)}
        </span>
      </Link>

      <div className="flex flex-1 flex-col gap-2.5 p-3.5 sm:p-4">
        <div className="min-w-0">
          <Link href={`/item/${item.id}`} className="block">
            <h3 className="truncate text-[15px] font-semibold tracking-[-0.018em] text-charcoal sm:text-base">
              {displayTitle}
            </h3>
          </Link>
          {item.description &&
            item.description.trim() &&
            item.description.trim() !== (displayTitle || '').trim() && (
              <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-[color:var(--text-tertiary)]">
                {item.description}
              </p>
            )}
          {locationLine && (
            <p className="mt-1 flex items-center gap-1 truncate text-xs text-[color:var(--text-tertiary)]">
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
              <span className="truncate">{locationLine}</span>
            </p>
          )}
        </div>

        <div className="mt-auto flex items-center justify-between gap-2">
          <div className="flex min-w-0 flex-wrap items-center gap-1.5">
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium ${status.className}`}
            >
              {status.label}
            </span>
            {category && (
              <span className="inline-flex items-center rounded-full bg-[color:var(--bg-inset)] px-2.5 py-0.5 text-[11px] font-medium text-[color:var(--text-secondary)]">
                {category}
              </span>
            )}
          </div>

          <div className="flex shrink-0 items-center gap-0.5">
            <button
              type="button"
              onClick={onTogglePlanned}
              className={`rounded-full p-1.5 transition-colors duration-fast ${
                isPlanned
                  ? 'text-orchid-400'
                  : 'text-[color:var(--text-tertiary)] hover:text-[color:var(--text-secondary)]'
              }`}
              aria-label={isPlanned ? 'Remove planned' : 'Mark as planned'}
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </button>
            <button
              type="button"
              onClick={onToggleLiked}
              className={`rounded-full p-1.5 transition-colors duration-fast ${
                isLiked
                  ? 'text-gold-500'
                  : 'text-[color:var(--text-tertiary)] hover:text-[color:var(--text-secondary)]'
              }`}
              aria-label={isLiked ? 'Remove liked' : 'Mark as liked'}
            >
              <svg
                className="h-4 w-4"
                fill={isLiked ? 'currentColor' : 'none'}
                stroke="currentColor"
                strokeWidth={2}
                viewBox="0 0 24 24"
              >
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
              </svg>
            </button>
            <button
              type="button"
              onClick={onAddToTrip}
              className="rounded-full p-1.5 text-[color:var(--text-tertiary)] transition-colors duration-fast hover:text-[color:var(--text-secondary)]"
              aria-label="Add to trip"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </article>
  )
}
