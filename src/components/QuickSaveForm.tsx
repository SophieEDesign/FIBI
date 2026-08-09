'use client'

/**
 * Two-second capture: URL + optional note.
 * Metadata and AI enrich run silently; anonymous auth preferred, guest localStorage as fallback.
 */

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  detectPlatform,
  getHostname,
  cleanOGTitle,
  generateHostnameTitle,
  isGenericOgTitle,
} from '@/lib/utils'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { addGuestSave } from '@/lib/guest-saves'
import { deriveLocationStatus } from '@/lib/location-status'
import { ensureSaveSession, isAnonymousUser } from '@/lib/anonymous-auth'
import { requestPersistThumbnail } from '@/lib/persist-thumbnail'

type EnrichResult = {
  title: string | null
  placeName: string | null
  city: string | null
  country: string | null
  category: string | null
  place?: {
    place_name: string
    place_id: string
    latitude: number
    longitude: number
    formatted_address: string
    city: string | null
    country: string | null
  } | null
  confidence?: {
    title: 'high' | 'medium' | 'low'
    location: 'high' | 'medium' | 'low'
    category: 'high' | 'medium' | 'low'
  }
}

export default function QuickSaveForm() {
  const [url, setUrl] = useState('')
  const [notes, setNotes] = useState('')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [thumbnailUrl, setThumbnailUrl] = useState('')
  const [enrich, setEnrich] = useState<EnrichResult | null>(null)
  const [fetchingMetadata, setFetchingMetadata] = useState(false)
  const [aiLoading, setAiLoading] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [savedToast, setSavedToast] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)
  const [isAnonymous, setIsAnonymous] = useState(false)
  const [autoSaveAttempted, setAutoSaveAttempted] = useState(false)

  const metadataFetchedRef = useRef(false)
  const enrichTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const supabase = createClient()
  const router = useRouter()
  const searchParams = useSearchParams()
  const itineraryIdParam = searchParams.get('itinerary_id')

  useEffect(() => {
    const check = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setIsAuthenticated(!!user)
      setIsAnonymous(isAnonymousUser(user))
    }
    check()
  }, [supabase])

  // Prefill from share-target query params
  useEffect(() => {
    const sharedUrl = searchParams.get('url')
    const sharedText = searchParams.get('text')
    const sharedTitle = searchParams.get('title')

    let found = sharedUrl?.trim() || ''
    if (!found && sharedText) {
      const match = sharedText.match(/https?:\/\/[^\s]+/)
      if (match) found = match[0]
      else if (!notes) setNotes(sharedText.trim())
    }
    if (found) {
      setUrl(found)
      if (sharedTitle) setTitle(sharedTitle)
    } else if (sharedTitle && !title) {
      setTitle(sharedTitle)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  const fetchMetadata = async (urlToFetch: string) => {
    try {
      new URL(urlToFetch)
    } catch {
      return null
    }
    setFetchingMetadata(true)
    try {
      const response = await fetch('/api/metadata', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: urlToFetch }),
      })
      if (!response.ok) return null
      return await response.json()
    } catch {
      return null
    } finally {
      setFetchingMetadata(false)
    }
  }

  const runEnrich = async (
    urlToEnrich: string,
    currentTitle: string,
    currentDescription: string,
    scrapedContent?: string | null
  ) => {
    setAiLoading(true)
    try {
      const response = await fetch('/api/ai-enrich', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: urlToEnrich,
          title: currentTitle || null,
          description: currentDescription || null,
          domain: getHostname(urlToEnrich) || null,
          platform: detectPlatform(urlToEnrich) || null,
          scrapedContent: scrapedContent || null,
        }),
      })
      if (!response.ok) return
      const data = await response.json()
      if (data.error) return

      let place = null
      const searchQuery =
        data.suggestedPlaceName ||
        [data.suggestedCity, data.suggestedCountry].filter(Boolean).join(', ')
      if (
        searchQuery &&
        (data.confidence?.location === 'high' || data.confidence?.location === 'medium')
      ) {
        try {
          const placesRes = await fetch('/api/places', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query: searchQuery }),
          })
          if (placesRes.ok) {
            const placesData = await placesRes.json()
            if (placesData.place) {
              place = {
                place_name: placesData.place.name,
                place_id: placesData.place.place_id,
                latitude: placesData.place.geometry.location.lat,
                longitude: placesData.place.geometry.location.lng,
                formatted_address: placesData.place.formatted_address || '',
                city: data.suggestedCity || placesData.city || null,
                country: data.suggestedCountry || placesData.country || null,
              }
            }
          }
        } catch {
          // non-blocking
        }
      }

      const result: EnrichResult = {
        title: data.suggestedTitle,
        placeName: data.suggestedPlaceName,
        city: data.suggestedCity,
        country: data.suggestedCountry,
        category: data.suggestedCategory,
        place,
        confidence: data.confidence,
      }
      setEnrich(result)

      if (
        data.suggestedTitle &&
        (data.confidence?.title === 'high' || data.confidence?.title === 'medium') &&
        (!currentTitle.trim() || isGenericOgTitle(currentTitle) || currentTitle.startsWith('Place from '))
      ) {
        setTitle(data.suggestedTitle)
      }
    } catch {
      // non-blocking
    } finally {
      setAiLoading(false)
    }
  }

  const handleUrlChange = async (value: string) => {
    setUrl(value)
    metadataFetchedRef.current = false
    setEnrich(null)
    if (enrichTimeoutRef.current) clearTimeout(enrichTimeoutRef.current)

    if (!value.trim()) return

    enrichTimeoutRef.current = setTimeout(async () => {
      const metadata = await fetchMetadata(value.trim())
      metadataFetchedRef.current = true
      let nextTitle = title
      let nextDesc = description
      if (metadata) {
        if (metadata.title) {
          const cleaned = cleanOGTitle(metadata.title) || metadata.title
          if (!title.trim() || isGenericOgTitle(title)) {
            nextTitle = cleaned
            setTitle(cleaned)
          }
        }
        if (metadata.description) {
          nextDesc = metadata.description
          setDescription(metadata.description)
        }
        if (metadata.image) setThumbnailUrl(metadata.image)
      }
      await runEnrich(value.trim(), nextTitle, nextDesc, metadata?.scrapedContent)
    }, 600)
  }

  useEffect(() => {
    if (url.trim() && !metadataFetchedRef.current) {
      handleUrlChange(url)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const buildPayload = () => {
    const finalTitle =
      title.trim() ||
      enrich?.title?.trim() ||
      generateHostnameTitle(url)
    const category =
      enrich?.confidence?.category === 'high' || enrich?.confidence?.category === 'medium'
        ? enrich.category
          ? JSON.stringify([enrich.category])
          : null
        : null
    const place = enrich?.place
    const fields = {
      url: url.trim(),
      platform: detectPlatform(url.trim()),
      title: finalTitle || null,
      description: description.trim() || null,
      thumbnail_url: thumbnailUrl || null,
      notes: notes.trim() || null,
      location_country: place?.country || enrich?.country || null,
      location_city: place?.city || enrich?.city || null,
      place_name: place?.place_name || enrich?.placeName || null,
      place_id: place?.place_id || null,
      latitude: place?.latitude ?? null,
      longitude: place?.longitude ?? null,
      formatted_address: place?.formatted_address || null,
      category,
    }
    return {
      ...fields,
      location_status: deriveLocationStatus(fields),
    }
  }

  const persistSave = async () => {
    if (!url.trim()) {
      setError('Paste a link to save.')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const payload = buildPayload()
      const session = await ensureSaveSession(supabase)

      if (!session) {
        addGuestSave(payload)
        setSavedToast(true)
        setLoading(false)
        setTimeout(() => {
          router.push('/saved?guest=1')
        }, 600)
        return
      }

      const { user } = session
      setIsAuthenticated(true)
      setIsAnonymous(session.isAnonymous)

      let tripPosition: number | null = null
      const itineraryId =
        itineraryIdParam && itineraryIdParam.trim() ? itineraryIdParam.trim() : null

      if (itineraryId) {
        const { count } = await supabase
          .from('saved_items')
          .select('*', { count: 'exact', head: true })
          .eq('itinerary_id', itineraryId)
        tripPosition = (count ?? 0) + 1
      }

      const { count } = await supabase
        .from('saved_items')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)

      const { data: inserted, error: insertError } = await supabase
        .from('saved_items')
        .insert({
          user_id: user.id,
          ...payload,
          screenshot_url: null,
          liked: false,
          visited: false,
          planned: false,
          itinerary_id: itineraryId,
          trip_position: tripPosition,
        })
        .select('id')
        .single()

      if (insertError) throw insertError

      // Rehost CDN preview into our storage while the signed URL still works
      if (inserted?.id && payload.thumbnail_url) {
        void requestPersistThumbnail(inserted.id, payload.thumbnail_url)
      }

      if (count === 0 && typeof window !== 'undefined') {
        sessionStorage.setItem('firstPlaceAdded', '1')
      }

      setSavedToast(true)
      setTimeout(() => {
        if (itineraryId) {
          router.push(`/app/calendar?itinerary_id=${encodeURIComponent(itineraryId)}`)
        } else {
          router.push('/app')
        }
        router.refresh()
      }, 600)
    } catch (err) {
      console.error(err)
      setError("That didn't work. Try again.")
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await persistSave()
  }

  useEffect(() => {
    const fromShare = searchParams.get('url') || searchParams.get('text')
    if (!fromShare || autoSaveAttempted || !url.trim() || loading) return
    if (fetchingMetadata || aiLoading) return

    const t = setTimeout(() => {
      if (autoSaveAttempted) return
      setAutoSaveAttempted(true)
      void persistSave()
    }, 2200)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, fetchingMetadata, aiLoading, searchParams, autoSaveAttempted, loading])

  const previewLabel =
    title || enrich?.placeName || (url ? getHostname(url) : null) || 'Your place'
  const locationLabel =
    enrich?.place?.place_name ||
    [enrich?.city || enrich?.place?.city, enrich?.country || enrich?.place?.country]
      .filter(Boolean)
      .join(', ')

  return (
    <div className="min-h-screen bg-fibi-bg-light">
      <header className="bg-white/80 border-b border-gray-100 md:hidden">
        <div className="max-w-lg mx-auto px-4 py-4 flex items-center justify-between">
          <Link href={isAuthenticated && !isAnonymous ? '/app' : '/'} className="text-xl font-semibold text-fibi-text-primary">
            FIBI
          </Link>
          <Link
            href={isAuthenticated && !isAnonymous ? '/app' : '/'}
            className="text-sm text-fibi-muted hover:text-fibi-text-primary"
          >
            Cancel
          </Link>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-10">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-8 space-y-6">
          <div>
            <h1 className="text-2xl font-semibold text-fibi-text-primary">Save a place</h1>
            <p className="text-sm text-fibi-muted mt-1">
              Paste a link. We&apos;ll do the rest.
            </p>
          </div>

          {savedToast && (
            <div className="bg-green-50 border border-green-100 text-green-800 px-4 py-3 rounded-lg text-sm">
              Saved.
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-100 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="url" className="block text-sm font-medium text-fibi-text-primary mb-1.5">
                Link
              </label>
              <input
                id="url"
                type="url"
                value={url}
                onChange={(e) => handleUrlChange(e.target.value)}
                placeholder="https://…"
                className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-fibi-primary/30 focus:border-fibi-primary"
                autoFocus
                required
              />
              {(fetchingMetadata || aiLoading) && (
                <p className="text-xs text-fibi-muted mt-1.5">Fetching preview…</p>
              )}
            </div>

            {(thumbnailUrl || title || locationLabel) && (
              <div className="flex gap-3 items-start rounded-xl bg-fibi-bg-light/80 p-3 border border-gray-100">
                {thumbnailUrl ? (
                  <img
                    src={thumbnailUrl}
                    alt=""
                    className="w-16 h-16 rounded-lg object-cover shrink-0"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-lg bg-fibi-blue-light/40 shrink-0" />
                )}
                <div className="min-w-0">
                  <p className="text-sm font-medium text-fibi-text-primary truncate">
                    {previewLabel}
                  </p>
                  {locationLabel && (
                    <p className="text-xs text-fibi-muted mt-0.5 truncate">{locationLabel}</p>
                  )}
                </div>
              </div>
            )}

            <div>
              <label htmlFor="notes" className="block text-sm font-medium text-fibi-text-primary mb-1.5">
                Note <span className="text-fibi-muted font-normal">(optional)</span>
              </label>
              <input
                id="notes"
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Why you saved it"
                className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-fibi-primary/30 focus:border-fibi-primary"
              />
            </div>

            <button
              type="submit"
              disabled={loading || !url.trim()}
              className="w-full bg-accent text-white py-3.5 rounded-full font-medium hover:opacity-95 transition-all shadow-md disabled:opacity-50"
            >
              {loading ? 'Saving…' : 'Save'}
            </button>

            {(!isAuthenticated || isAnonymous) && (
              <p className="text-xs text-fibi-muted text-center">
                {isAnonymous
                  ? 'Your places are saved. '
                  : 'Saved on this device for now. '}
                <Link href="/signup?redirect=/app" className="text-fibi-primary hover:underline">
                  Create an account
                </Link>{' '}
                to keep them.
              </p>
            )}
          </form>
        </div>
      </main>
    </div>
  )
}
