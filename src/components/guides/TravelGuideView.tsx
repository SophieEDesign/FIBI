'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import SiteFooter from '@/components/SiteFooter'
import GuideMap from '@/components/guides/GuideMap'
import GuidePlaceCard from '@/components/guides/GuidePlaceCard'
import GuideCardLink from '@/components/guides/GuideCardLink'
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
} from '@/lib/travel-guides'
import type { TravelGuide, TravelGuidePlace } from '@/types/database'

interface TravelGuideViewProps {
  guide: TravelGuide
  places: TravelGuidePlace[]
  related: GuideCard[]
  destinationHubSlug: string | null
}

export default function TravelGuideView({
  guide,
  places,
  related,
  destinationHubSlug,
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

  const sections = useMemo(() => groupPlacesBySection(places), [places])
  const locationLabel = [guide.destination_name || guide.city, guide.country]
    .filter(Boolean)
    .join(', ')
  const updated = formatGuideDate(guide.updated_at || guide.published_at)
  const destKey = guideDestinationKey(guide)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUserId(user?.id ?? null)
      setIsAnon(isAnonymousUser(user))
    })
  }, [])

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
      if (!userId || isAnon) {
        addGuestSave(guestFieldsFromPlace(place))
        setSavedPlaceIds((prev) => new Set(prev).add(place.id))
        setMessage('Saved for now. Create a free account to keep your places.')
        return
      }

      const res = await fetch(`/api/travel-guides/places/${place.id}/save`, {
        method: 'POST',
      })
      const data = await res.json()
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
      if (!userId || isAnon) {
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
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "That didn't work. Try again.")
      router.push(`/app/calendar?itinerary=${data.itinerary_id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : "That didn't work. Try again.")
    } finally {
      setSavingAll(false)
    }
  }

  return (
    <div className="min-h-screen bg-fibi-bg-light flex flex-col">
      <header className="bg-white/90 border-b border-gray-100 sticky top-0 z-20 backdrop-blur-sm">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="text-xl font-semibold text-fibi-text-primary">
            FIBI
          </Link>
          <nav className="flex items-center gap-4 text-sm">
            <Link href="/travel-guides" className="text-fibi-muted hover:text-fibi-text-primary">
              Travel Guides
            </Link>
            <Link href="/add" className="font-medium text-fibi-muted hover:text-fibi-text-primary">
              Save a place
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="relative">
          <div className="aspect-[21/9] sm:aspect-[2.4/1] max-h-[420px] w-full overflow-hidden bg-gray-200">
            {guide.cover_image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={guide.cover_image_url}
                alt=""
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="h-full w-full bg-gradient-to-br from-gray-300 via-gray-200 to-gray-100" />
            )}
          </div>
          <div className="max-w-3xl mx-auto px-4 -mt-16 sm:-mt-20 relative z-10">
            <div className="bg-white/95 backdrop-blur-sm border border-gray-100 shadow-soft p-6 sm:p-8">
              <nav className="text-xs text-fibi-muted mb-4" aria-label="Breadcrumb">
                <ol className="flex flex-wrap gap-1">
                  <li>
                    <Link href="/travel-guides" className="hover:text-fibi-text-primary">
                      Travel Guides
                    </Link>
                  </li>
                  {destinationHubSlug && destKey && (
                    <>
                      <li aria-hidden>/</li>
                      <li>
                        <Link
                          href={`/travel-guides/in/${destinationHubSlug}`}
                          className="hover:text-fibi-text-primary"
                        >
                          {destKey}
                        </Link>
                      </li>
                    </>
                  )}
                  <li aria-hidden>/</li>
                  <li className="text-fibi-text-primary truncate max-w-[12rem] sm:max-w-none">
                    {guide.title}
                  </li>
                </ol>
              </nav>

              <h1 className="text-3xl sm:text-4xl font-medium text-fibi-text-primary leading-tight">
                {guide.title}
              </h1>
              {guide.introduction && (
                <p className="mt-4 text-fibi-muted leading-relaxed text-base sm:text-lg">
                  {guide.introduction}
                </p>
              )}
              <p className="mt-4 text-sm text-fibi-muted">
                {[
                  locationLabel,
                  `${places.length} place${places.length === 1 ? '' : 's'}`,
                  updated ? `Updated ${updated}` : null,
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </p>

              {places.length > 0 && (
                <div className="mt-6 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={handleSaveAll}
                    disabled={savingAll}
                    className="inline-flex items-center px-5 py-2.5 text-sm font-medium bg-fibi-text-primary text-white hover:opacity-90 disabled:opacity-60"
                  >
                    {savingAll ? 'Saving…' : 'Save all to a Travel Board'}
                  </button>
                  {(!userId || isAnon) && (
                    <Link
                      href={`/signup?redirect=${encodeURIComponent(`/travel-guides/${guide.slug}`)}`}
                      className="inline-flex items-center px-5 py-2.5 text-sm font-medium text-fibi-text-primary border border-gray-200"
                    >
                      Create a free account
                    </Link>
                  )}
                </div>
              )}

              {(message || error) && (
                <p
                  className={`mt-4 text-sm ${error ? 'text-red-600' : 'text-fibi-muted'}`}
                  role="status"
                >
                  {error || message}
                  {message && (!userId || isAnon) && (
                    <>
                      {' '}
                      <Link
                        href={`/signup?redirect=${encodeURIComponent(`/travel-guides/${guide.slug}`)}`}
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

        {/* Map */}
        {places.some((p) => p.latitude != null && p.longitude != null) && (
          <section className="max-w-3xl mx-auto px-4 mt-10">
            <h2 className="text-lg font-medium text-fibi-text-primary mb-3">Map</h2>
            <GuideMap
              places={places}
              selectedPlaceId={selectedPlaceId}
              onSelectPlace={onSelectPlace}
              className="border border-gray-100"
            />
          </section>
        )}

        {/* Places */}
        <section className="max-w-3xl mx-auto px-4 mt-12 pb-8">
          {sections.map(({ section, places: sectionPlaces }) => (
            <div key={section} className="mb-10">
              <h2 className="text-2xl font-medium text-fibi-text-primary mb-2">{section}</h2>
              <div>
                {sectionPlaces.map((place) => (
                  <GuidePlaceCard
                    key={place.id}
                    place={place}
                    selected={selectedPlaceId === place.id}
                    saving={savingPlaceId === place.id}
                    saved={savedPlaceIds.has(place.id)}
                    onSave={() => handleSavePlace(place)}
                    onShowOnMap={() => {
                      setSelectedPlaceId(place.id)
                      window.scrollTo({ top: 0, behavior: 'smooth' })
                    }}
                  />
                ))}
              </div>
            </div>
          ))}

          {places.length === 0 && (
            <p className="text-fibi-muted py-12 text-center">
              Places for this guide are coming soon.
            </p>
          )}
        </section>

        {/* Related */}
        {related.length > 0 && (
          <section className="border-t border-gray-100 bg-white/50 py-14">
            <div className="max-w-3xl mx-auto px-4">
              <h2 className="text-xl font-medium text-fibi-text-primary mb-8">
                More guides
                {destKey ? ` in ${destKey}` : ''}
              </h2>
              <div className="grid sm:grid-cols-2 gap-8">
                {related.map((g) => (
                  <GuideCardLink key={g.id} guide={g} />
                ))}
              </div>
              {destinationHubSlug && (
                <p className="mt-8">
                  <Link
                    href={`/travel-guides/in/${destinationHubSlug}`}
                    className="text-sm font-medium text-fibi-text-primary underline underline-offset-2"
                  >
                    All guides for {destKey}
                  </Link>
                </p>
              )}
            </div>
          </section>
        )}
      </main>

      <SiteFooter />
    </div>
  )
}
