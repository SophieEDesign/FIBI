'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import SiteFooter from '@/components/SiteFooter'
import GuideMap from '@/components/guides/GuideMap'
import GuidePlaceCard from '@/components/guides/GuidePlaceCard'
import GuideCardLink from '@/components/guides/GuideCardLink'
import { Button } from '@/components/ui/Button'
import { createClient } from '@/lib/supabase/client'
import {
  addGuestSave,
  setGuestPendingBoard,
  type GuestSave,
} from '@/lib/guest-saves'
import { isAnonymousUser } from '@/lib/anonymous-auth'
import {
  defaultBoardNameFromGuide,
  formatGuideDate,
  groupPlacesBySection,
  guideDestinationKey,
  guidePlaceToSavedItemFields,
  type GuideCard,
} from '@/lib/travel-guides-shared'
import { setGuideAttribution, signupHrefForGuide } from '@/lib/guide-attribution'
import type { TravelGuide, TravelGuidePlace } from '@/types/database'

interface TravelGuideViewProps {
  guide: TravelGuide
  places: TravelGuidePlace[]
  related: GuideCard[]
  destinationHubSlug: string | null
  /** Inside the logged-in app shell — skip public header/footer. */
  embedded?: boolean
}

export default function TravelGuideView({
  guide,
  places,
  related,
  destinationHubSlug,
  embedded = false,
}: TravelGuideViewProps) {
  const router = useRouter()
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [isAnon, setIsAnon] = useState(false)
  const [savingPlaceId, setSavingPlaceId] = useState<string | null>(null)
  const [savedPlaceIds, setSavedPlaceIds] = useState<Set<string>>(new Set())
  const [savingAll, setSavingAll] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [introExpanded, setIntroExpanded] = useState(false)

  const sections = useMemo(() => groupPlacesBySection(places), [places])
  const locationLabel = [guide.destination_name || guide.city, guide.country]
    .filter(Boolean)
    .join(', ')
  const updated = formatGuideDate(guide.updated_at || guide.published_at)
  const destKey = guideDestinationKey(guide)
  const previewImages = useMemo(
    () =>
      places
        .map((p) => p.image_url)
        .filter((url): url is string => Boolean(url))
        .slice(0, 8),
    [places]
  )
  const introLong = (guide.introduction?.length ?? 0) > 160
  const signupHref = signupHrefForGuide(guide.slug, `/travel-guides/${guide.slug}`)

  useEffect(() => {
    setGuideAttribution(guide.id)
  }, [guide.id])

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUserId(user?.id ?? null)
      setIsAnon(isAnonymousUser(user))
    })
  }, [])

  const resolveAuth = async () => {
    const supabase = createClient()
    // Prefer getUser() so the session refreshes if needed before we read the token
    const {
      data: { user },
    } = await supabase.auth.getUser()
    const id = user?.id ?? null
    const anon = isAnonymousUser(user)
    setUserId(id)
    setIsAnon(anon)

    let accessToken: string | null = null
    if (user && !anon) {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      accessToken = session?.access_token ?? null
    }

    return { userId: id, isAnon: anon, accessToken }
  }

  const authHeaders = (accessToken: string | null): HeadersInit =>
    accessToken ? { Authorization: `Bearer ${accessToken}` } : {}

  const onSelectPlace = useCallback((id: string | null) => {
    setSelectedPlaceId(id)
    if (id && typeof document !== 'undefined') {
      document.getElementById(`place-${id}`)?.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      })
    }
  }, [])

  const guestFieldsFromPlace = (place: TravelGuidePlace): Omit<GuestSave, 'id' | 'created_at'> => {
    const fields = guidePlaceToSavedItemFields(place)
    return {
      url: fields.url,
      platform: fields.platform,
      title: fields.title,
      description: fields.description,
      thumbnail_url: fields.thumbnail_url,
      notes: null,
      location_country: fields.location_country,
      location_city: fields.location_city,
      place_name: fields.place_name,
      place_id: fields.place_id,
      latitude: fields.latitude,
      longitude: fields.longitude,
      formatted_address: fields.formatted_address,
      category: fields.category,
    }
  }

  const handleSavePlace = async (place: TravelGuidePlace) => {
    setError(null)
    setMessage(null)
    setSavingPlaceId(place.id)

    try {
      const auth = await resolveAuth()
      if (!auth.userId || auth.isAnon) {
        addGuestSave(guestFieldsFromPlace(place))
        setSavedPlaceIds((prev) => new Set(prev).add(place.id))
        setMessage('Saved for now. Create a free account to keep your places.')
        return
      }

      const res = await fetch(`/api/travel-guides/places/${place.id}/save`, {
        method: 'POST',
        credentials: 'include',
        headers: authHeaders(auth.accessToken),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || "That didn't work. Try again.")
      setSavedPlaceIds((prev) => new Set(prev).add(place.id))
      setMessage(data.duplicate ? 'Already in your places.' : 'Saved to your places.')
    } catch (err) {
      setError(err instanceof Error ? err.message : "That didn't work. Try again.")
    } finally {
      setSavingPlaceId(null)
    }
  }

  const handleSaveAll = async () => {
    setError(null)
    setMessage(null)
    setSavingAll(true)

    try {
      const auth = await resolveAuth()
      if (!auth.userId || auth.isAnon) {
        const saveIds: string[] = []
        for (const place of places) {
          const entry = addGuestSave(guestFieldsFromPlace(place))
          saveIds.push(entry.id)
          setSavedPlaceIds((prev) => new Set(prev).add(place.id))
        }
        setGuestPendingBoard({
          name: defaultBoardNameFromGuide(guide),
          cover_image_url: guide.cover_image_url,
          saveIds,
        })
        setMessage('Places saved for now. Create a free account to keep them on a Travel Board.')
        return
      }

      const res = await fetch(`/api/travel-guides/${guide.slug}/save`, {
        method: 'POST',
        credentials: 'include',
        headers: authHeaders(auth.accessToken),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || "That didn't work. Try again.")
      if (!data.itinerary_id) {
        throw new Error("That didn't work. Try again.")
      }
      setMessage(`Saved to ${data.name || 'your Travel Board'}. Opening Trips…`)
      router.push(`/app/calendar?itinerary_id=${encodeURIComponent(data.itinerary_id)}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : "That didn't work. Try again.")
    } finally {
      setSavingAll(false)
    }
  }

  const saveAllLabel = savingAll
    ? 'Saving…'
    : `Save all ${places.length}`

  const guidesHome = embedded ? '/app/guides' : '/travel-guides'

  let placeIndex = 0

  return (
    <div className={`bg-[color:var(--bg-page)] flex flex-col ${embedded ? 'pb-20 md:pb-0' : 'min-h-screen'}`}>
      {!embedded && (
      <header className="fixed inset-x-0 top-0 z-30 border-b border-sky-200/40 bg-white/70 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3.5 sm:px-6">
          <Link
            href={userId && !isAnon ? '/app' : '/'}
            className="text-lg font-semibold tracking-[-0.02em] text-[color:var(--text-primary)]"
          >
            FIBI
          </Link>
          <nav className="flex items-center gap-3 text-sm">
            {userId && !isAnon ? (
              <>
                <Link
                  href="/app"
                  className="hidden text-[color:var(--text-secondary)] transition-colors hover:text-[color:var(--text-primary)] sm:inline"
                >
                  Your places
                </Link>
                <Link
                  href={guidesHome}
                  className="hidden text-[color:var(--text-secondary)] transition-colors hover:text-[color:var(--text-primary)] sm:inline"
                >
                  Travel Guides
                </Link>
                <Button href="/app/add" variant="soft" size="sm">
                  Save a place
                </Button>
              </>
            ) : (
              <>
                <Link
                  href={guidesHome}
                  className="hidden text-[color:var(--text-secondary)] transition-colors hover:text-[color:var(--text-primary)] sm:inline"
                >
                  Travel Guides
                </Link>
                <Button href="/add" variant="soft" size="sm">
                  Save a place
                </Button>
              </>
            )}
          </nav>
        </div>
      </header>
      )}

      <main className="flex-1">
        {/* Bright Mediterranean hero — sky / lilac wash over photography */}
        <section className={`relative min-h-[78vh] sm:min-h-[88vh] ${embedded ? '' : ''}`}>
          <div className="absolute inset-0 overflow-hidden bg-sky-100">
            {guide.cover_image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={guide.cover_image_url}
                alt=""
                className="h-full w-full object-cover scale-[1.02]"
              />
            ) : (
              <div className="h-full w-full bg-fibi-brand-soft" />
            )}
            <div
              className="absolute inset-0 bg-gradient-to-t from-sky-50 via-sky-50/55 to-orchid-200/20"
              aria-hidden
            />
            <div className="absolute inset-0 bg-fibi-aurora opacity-80" aria-hidden />
          </div>

          <div className={`relative z-10 flex min-h-[78vh] flex-col justify-end px-4 pb-10 sm:min-h-[88vh] sm:px-6 sm:pb-14 ${embedded ? 'pt-10' : 'pt-28'}`}>
            <div className="mx-auto w-full max-w-6xl">
              <nav className="mb-5 text-xs text-[color:var(--text-secondary)]" aria-label="Breadcrumb">
                <ol className="flex flex-wrap items-center gap-1.5">
                  <li>
                    <Link href={guidesHome} className="hover:text-[color:var(--text-primary)]">
                      Travel Guides
                    </Link>
                  </li>
                  {destinationHubSlug && destKey && (
                    <>
                      <li aria-hidden className="text-[color:var(--text-tertiary)]">
                        /
                      </li>
                      <li>
                        <Link
                          href={`/travel-guides/in/${destinationHubSlug}`}
                          className="hover:text-[color:var(--text-primary)]"
                        >
                          {destKey}
                        </Link>
                      </li>
                    </>
                  )}
                </ol>
              </nav>

              <div className="mb-5 flex flex-wrap gap-2">
                {locationLabel && (
                  <span className="rounded-full border border-sky-300/50 bg-white/70 px-3 py-1 text-xs font-medium uppercase tracking-[0.1em] text-sky-700 backdrop-blur-md">
                    {locationLabel}
                  </span>
                )}
                <span className="rounded-full border border-orchid-200/60 bg-white/70 px-3 py-1 text-xs font-medium text-orchid-600 backdrop-blur-md">
                  {places.length} place{places.length === 1 ? '' : 's'}
                </span>
                {updated && (
                  <span className="rounded-full border border-white/60 bg-white/50 px-3 py-1 text-xs text-[color:var(--text-secondary)] backdrop-blur-md">
                    Updated {updated}
                  </span>
                )}
              </div>

              <h1 className="max-w-3xl text-4xl font-semibold leading-[1.05] tracking-[-0.032em] text-[color:var(--text-primary)] sm:text-5xl md:text-6xl text-balance">
                {guide.title}
              </h1>

              {guide.introduction && (
                <div className="mt-5 max-w-xl">
                  <p
                    className={`text-base leading-relaxed text-[color:var(--text-secondary)] sm:text-lg ${
                      !introExpanded && introLong ? 'line-clamp-2' : ''
                    }`}
                  >
                    {guide.introduction}
                  </p>
                  {introLong && (
                    <button
                      type="button"
                      onClick={() => setIntroExpanded((v) => !v)}
                      className="mt-2 text-sm font-medium text-sky-600 hover:text-sky-700"
                    >
                      {introExpanded ? 'Show less' : 'Read more'}
                    </button>
                  )}
                </div>
              )}

              {places.length > 0 && (
                <div className="mt-8 flex flex-wrap items-center gap-3">
                  <Button
                    type="button"
                    variant="gradient"
                    size="lg"
                    onClick={handleSaveAll}
                    disabled={savingAll}
                  >
                    {savingAll
                      ? 'Saving…'
                      : `Add all ${places.length} to a board`}
                  </Button>
                  {(!userId || isAnon) && (
                    <Button
                      href={signupHref}
                      variant="secondary"
                      size="lg"
                    >
                      Create a free account
                    </Button>
                  )}
                </div>
              )}

              {(message || error) && (
                <p
                  className={`mt-4 max-w-xl text-sm ${error ? 'text-red-600' : 'text-[color:var(--text-secondary)]'}`}
                  role="status"
                >
                  {error || message}
                  {message && (!userId || isAnon) && (
                    <>
                      {' '}
                      <Link
                        href={signupHref}
                        className="underline underline-offset-2"
                      >
                        Create a free FIBI account
                      </Link>
                    </>
                  )}
                </p>
              )}
            </div>
          </div>
        </section>

        {/* Visual strip of place photos */}
        {previewImages.length >= 3 && (
          <section className="relative -mt-6 z-10" aria-hidden>
            <div className="mx-auto max-w-6xl px-4 sm:px-6">
              <div className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:gap-3">
                {previewImages.map((url, i) => (
                  <div
                    key={`${url}-${i}`}
                    className="relative h-24 w-20 shrink-0 overflow-hidden rounded-xl border-2 border-white shadow-soft sm:h-32 sm:w-28 sm:rounded-2xl"
                    style={{ transform: `rotate(${i % 2 === 0 ? -2 : 2}deg)` }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt="" className="h-full w-full object-cover" />
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Map */}
        {places.some((p) => p.latitude != null && p.longitude != null) && (
          <section className="mx-auto max-w-6xl px-4 pt-12 sm:px-6 sm:pt-16">
            <div className="mb-4 flex items-end justify-between gap-4">
              <div>
                <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-[color:var(--text-tertiary)]">
                  Explore
                </p>
                <h2 className="mt-1 text-2xl font-semibold tracking-[-0.02em] text-[color:var(--text-primary)] sm:text-3xl">
                  On the map
                </h2>
              </div>
              <p className="hidden text-sm text-[color:var(--text-secondary)] sm:block">
                Tap a pin, then save what you love.
              </p>
            </div>
            <GuideMap
              places={places}
              selectedPlaceId={selectedPlaceId}
              onSelectPlace={onSelectPlace}
              className="overflow-hidden rounded-2xl border border-[color:var(--border-subtle)] shadow-soft"
            />
          </section>
        )}

        {/* Places — graphic grid */}
        <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
          {sections.map(({ section, places: sectionPlaces }) => (
            <div key={section} className="mb-16 last:mb-0">
              <div className="mb-6 flex items-end gap-4 sm:mb-8">
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-sky-600">
                    {sectionPlaces.length} stop{sectionPlaces.length === 1 ? '' : 's'}
                  </p>
                  <h2 className="mt-1 text-3xl font-semibold tracking-[-0.028em] text-[color:var(--text-primary)] sm:text-4xl">
                    {section}
                  </h2>
                </div>
                <div className="hidden h-px flex-1 bg-gradient-to-r from-[color:var(--border-subtle)] to-transparent sm:block" />
              </div>

              <div className="grid gap-5 sm:grid-cols-2 sm:gap-6">
                {sectionPlaces.map((place, i) => {
                  placeIndex += 1
                  const currentIndex = placeIndex
                  return (
                    <GuidePlaceCard
                      key={place.id}
                      place={place}
                      index={currentIndex}
                      featured={i === 0 && sectionPlaces.length > 2}
                      selected={selectedPlaceId === place.id}
                      saving={savingPlaceId === place.id}
                      saved={savedPlaceIds.has(place.id)}
                      onSave={() => handleSavePlace(place)}
                      onShowOnMap={() => {
                        setSelectedPlaceId(place.id)
                        const mapEl = document.querySelector('[data-guide-map]')
                        if (mapEl) {
                          mapEl.scrollIntoView({ behavior: 'smooth', block: 'center' })
                        } else {
                          window.scrollTo({ top: 0, behavior: 'smooth' })
                        }
                      }}
                    />
                  )
                })}
              </div>
            </div>
          ))}

          {places.length === 0 && (
            <p className="py-16 text-center text-[color:var(--text-secondary)]">
              Places for this guide are coming soon.
            </p>
          )}

          {places.length > 0 && (
            <div className="relative mt-16 overflow-hidden rounded-3xl bg-fibi-brand-soft px-6 py-12 text-center sm:px-10 sm:py-16">
              <div className="pointer-events-none absolute inset-0 bg-fibi-aurora opacity-90" aria-hidden />
              <div className="relative z-10 mx-auto max-w-lg">
                <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-sky-600">
                  Keep them close
                </p>
                <h2 className="mt-3 text-3xl font-semibold tracking-[-0.028em] text-[color:var(--text-primary)] sm:text-4xl">
                  Save the {guide.destination_name || 'places'} you actually want to visit
                </h2>
                <p className="mt-4 text-[color:var(--text-secondary)] leading-relaxed">
                  You don&apos;t need to build an itinerary yet. Create a{' '}
                  {guide.destination_name || 'Travel'} Board, save what catches your eye,
                  then come back when the flights finally get booked.
                </p>
                <div className="mt-8 flex flex-wrap justify-center gap-3">
                  <Button
                    type="button"
                    variant="gradient"
                    size="lg"
                    onClick={handleSaveAll}
                    disabled={savingAll}
                  >
                    {savingAll
                      ? 'Saving…'
                      : `Save all ${places.length} to a ${guide.destination_name || 'Travel'} Board`}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* Related */}
        {related.length > 0 && (
          <section className="border-t border-[color:var(--border-subtle)] bg-[color:var(--bg-subtle)] py-14 sm:py-20">
            <div className="mx-auto max-w-6xl px-4 sm:px-6">
              <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-[color:var(--text-tertiary)]">
                    Keep exploring
                  </p>
                  <h2 className="mt-1 text-2xl font-semibold tracking-[-0.02em] text-[color:var(--text-primary)] sm:text-3xl">
                    More guides{destKey ? ` in ${destKey}` : ''}
                  </h2>
                </div>
                {destinationHubSlug && (
                  <Link
                    href={`/travel-guides/in/${destinationHubSlug}`}
                    className="text-sm font-medium text-sky-600 underline-offset-2 hover:underline"
                  >
                    All guides for {destKey}
                  </Link>
                )}
              </div>
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4 sm:gap-6">
                {related.map((g) => (
                  <GuideCardLink key={g.id} guide={g} basePath={guidesHome} />
                ))}
              </div>
            </div>
          </section>
        )}
      </main>

      {/* Status toast — visible while scrolled past the hero */}
      {(message || error) && (
        <div
          className={`fixed inset-x-4 z-40 mx-auto max-w-lg rounded-2xl border px-4 py-3 text-sm shadow-soft-md backdrop-blur-md sm:inset-x-auto ${
            embedded ? 'bottom-36 sm:bottom-6' : 'bottom-24 sm:bottom-6'
          } ${
            error
              ? 'border-red-200 bg-red-50 text-red-700'
              : 'border-sky-200 bg-white/95 text-[color:var(--text-primary)]'
          }`}
          role="status"
        >
          {error || message}
          {message && (!userId || isAnon) && (
            <>
              {' '}
              <Link
                href={signupHref}
                className="font-medium underline underline-offset-2"
              >
                Create a free account
              </Link>
            </>
          )}
        </div>
      )}

      {/* Mobile sticky save bar — sit above bottom nav when embedded in the app */}
      {places.length > 0 && (
        <div
          className={`fixed inset-x-0 z-30 border-t border-[color:var(--border-subtle)] bg-white/90 p-3 backdrop-blur-md sm:hidden ${
            embedded
              ? 'bottom-16 pb-3'
              : 'bottom-0 pb-[max(0.75rem,env(safe-area-inset-bottom))]'
          }`}
        >
          <Button
            type="button"
            variant="gradient"
            size="lg"
            fullWidth
            onClick={handleSaveAll}
            disabled={savingAll}
          >
            {saveAllLabel}
          </Button>
        </div>
      )}

      {!embedded && (
        <div className={places.length > 0 ? 'pb-20 sm:pb-0' : undefined}>
          <SiteFooter />
        </div>
      )}
      {embedded && places.length > 0 && <div className="h-16 sm:hidden" aria-hidden />}
    </div>
  )
}
