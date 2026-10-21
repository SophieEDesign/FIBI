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
import { getProxiedImageUrl } from '@/lib/image-proxy'
import { isTikTokUrl } from '@/lib/tiktok-oembed'
import { buildLocationSearchQuery, geocodePlaceQuery } from '@/lib/geocode-place'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'

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
  const enrichRef = useRef<EnrichResult | null>(null)
  const enrichTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const supabase = createClient()
  const router = useRouter()
  const searchParams = useSearchParams()
  const itineraryIdParam = searchParams.get('itinerary_id')

  const setEnrichBoth = (value: EnrichResult | null) => {
    enrichRef.current = value
    setEnrich(value)
  }

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
      let metadata = await response.json() as {
        title?: string | null
        description?: string | null
        image?: string | null
        scrapedContent?: string | null
      }

      // TikTok short links: if metadata is thin, also try oEmbed (server normalizes vm. links)
      const thin =
        !metadata.image ||
        !metadata.title ||
        isGenericOgTitle(cleanOGTitle(metadata.title)) ||
        /^place from\s+/i.test((metadata.title || '').trim())
      if (isTikTokUrl(urlToFetch) && thin) {
        try {
          const oembedRes = await fetch('/api/oembed', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: urlToFetch }),
          })
          if (oembedRes.ok) {
            const oembed = await oembedRes.json()
            metadata = {
              title: metadata.title || oembed.title || null,
              description:
                metadata.description || oembed.caption_text || oembed.title || null,
              image: metadata.image || oembed.thumbnail_url || null,
              scrapedContent:
                metadata.scrapedContent ||
                oembed.caption_text ||
                oembed.title ||
                null,
            }
          }
        } catch {
          // non-blocking
        }
      }

      return metadata
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
  ): Promise<EnrichResult | null> => {
    setAiLoading(true)
    try {
      // Caption first: description is usually the post caption; scraped text backs it up
      const caption =
        (currentDescription || '').trim() ||
        (scrapedContent || '').trim() ||
        null

      const response = await fetch('/api/ai-enrich', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: urlToEnrich,
          title: currentTitle || null,
          description: caption,
          domain: getHostname(urlToEnrich) || null,
          platform: detectPlatform(urlToEnrich) || null,
          scrapedContent: scrapedContent || caption || null,
        }),
      })
      if (!response.ok) return null
      const data = await response.json()
      if (data.error && !data.suggestedPlaceName && !data.suggestedCity) return null

      // Geocode whenever AI found a place or city — pins need lat/lng, not only high confidence
      const searchQuery = buildLocationSearchQuery({
        placeName: data.suggestedPlaceName,
        city: data.suggestedCity,
        country: data.suggestedCountry,
      })
      const place = searchQuery
        ? await geocodePlaceQuery(searchQuery, {
            city: data.suggestedCity,
            country: data.suggestedCountry,
          })
        : null

      const result: EnrichResult = {
        title: data.suggestedTitle,
        placeName: data.suggestedPlaceName,
        city: data.suggestedCity,
        country: data.suggestedCountry,
        category: data.suggestedCategory,
        place,
        confidence: data.confidence,
      }
      setEnrichBoth(result)

      if (
        data.suggestedTitle &&
        (data.confidence?.title === 'high' || data.confidence?.title === 'medium') &&
        (!currentTitle.trim() || isGenericOgTitle(currentTitle) || currentTitle.startsWith('Place from '))
      ) {
        setTitle(data.suggestedTitle)
      }
      return result
    } catch {
      return null
    } finally {
      setAiLoading(false)
    }
  }

  const handleUrlChange = async (value: string) => {
    setUrl(value)
    metadataFetchedRef.current = false
    setEnrichBoth(null)
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
          if (
            !title.trim() ||
            isGenericOgTitle(title) ||
            /^place from\s+/i.test(title.trim())
          ) {
            nextTitle = cleaned
            setTitle(cleaned)
          }
        }
        // Caption → description (TikTok oEmbed title is the caption)
        const caption =
          metadata.description || metadata.scrapedContent || null
        if (caption) {
          nextDesc = caption
          setDescription(caption)
        }
        if (metadata.image) setThumbnailUrl(metadata.image)
      }
      await runEnrich(
        value.trim(),
        nextTitle,
        nextDesc,
        metadata?.scrapedContent || nextDesc || null
      )
    }, 600)
  }

  useEffect(() => {
    if (url.trim() && !metadataFetchedRef.current) {
      handleUrlChange(url)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const buildPayload = (enrichOverride?: EnrichResult | null) => {
    const active = enrichOverride ?? enrichRef.current ?? enrich
    const finalTitle =
      title.trim() ||
      active?.title?.trim() ||
      generateHostnameTitle(url)
    const category =
      active?.confidence?.category === 'high' || active?.confidence?.category === 'medium'
        ? active.category
          ? JSON.stringify([active.category])
          : null
        : null
    const place = active?.place
    const fields = {
      url: url.trim(),
      platform: detectPlatform(url.trim()),
      title: finalTitle || null,
      description: description.trim() || null,
      thumbnail_url: thumbnailUrl || null,
      notes: notes.trim() || null,
      location_country: place?.country || active?.country || null,
      location_city: place?.city || active?.city || null,
      place_name: place?.place_name || active?.placeName || null,
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
      // Ensure TikTok (and other) metadata finished before insert — users often hit Save early
      let saveTitle = title
      let saveDescription = description
      let saveThumbnail = thumbnailUrl
      let scrapedForEnrich: string | null = null
      const needsMeta =
        !metadataFetchedRef.current ||
        !saveThumbnail ||
        !saveTitle.trim() ||
        isGenericOgTitle(saveTitle) ||
        /^place from\s+/i.test(saveTitle.trim()) ||
        !saveDescription.trim()

      if (needsMeta) {
        const metadata = await fetchMetadata(url.trim())
        metadataFetchedRef.current = true
        if (metadata?.title) {
          const cleaned = cleanOGTitle(metadata.title) || metadata.title
          if (
            !saveTitle.trim() ||
            isGenericOgTitle(saveTitle) ||
            /^place from\s+/i.test(saveTitle.trim())
          ) {
            saveTitle = cleaned
            setTitle(cleaned)
          }
        }
        const caption = metadata?.description || metadata?.scrapedContent || null
        if (caption) {
          saveDescription = caption
          setDescription(caption)
        }
        scrapedForEnrich = metadata?.scrapedContent || caption || null
        if (metadata?.image) {
          saveThumbnail = metadata.image
          setThumbnailUrl(metadata.image)
        }
      }

      // Pull place/city from caption via AI + geocode so the pin lands without typing
      let activeEnrich = enrichRef.current
      const needsLocation =
        !activeEnrich?.place?.latitude || !activeEnrich?.place?.longitude
      if (needsLocation) {
        const enrichResult = await runEnrich(
          url.trim(),
          saveTitle,
          saveDescription,
          scrapedForEnrich || saveDescription || null
        )
        if (enrichResult) activeEnrich = enrichResult
      }

      const payload = {
        ...buildPayload(activeEnrich),
        title:
          saveTitle.trim() ||
          activeEnrich?.title?.trim() ||
          generateHostnameTitle(url),
        description: saveDescription.trim() || null,
        thumbnail_url: saveThumbnail || null,
      }
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
    <div className="min-h-screen bg-[color:var(--bg-subtle)]">
      <header className="bg-[color:var(--surface-glass)] border-b border-[color:var(--border-subtle)] md:hidden backdrop-blur-[18px]">
        <div className="max-w-lg mx-auto px-4 py-4 flex items-center justify-between">
          <Link href={isAuthenticated && !isAnonymous ? '/app' : '/'} className="text-xl font-semibold text-[color:var(--text-primary)]">
            FIBI
          </Link>
          <Link
            href={isAuthenticated && !isAnonymous ? '/app' : '/'}
            className="text-sm text-secondary hover:text-[color:var(--text-primary)]"
          >
            Cancel
          </Link>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-10">
        <Card className="p-6 sm:p-8 space-y-6" elevation="sm">
          <div>
            <h1 className="text-2xl font-semibold text-[color:var(--text-primary)]">Save a place</h1>
            <p className="text-sm text-secondary mt-1">
              Paste a link. We&apos;ll do the rest.
            </p>
          </div>

          {savedToast && (
            <div className="bg-[color:var(--status-success-bg)] text-[color:var(--status-success-fg)] px-4 py-3 rounded-xl text-sm">
              Saved.
            </div>
          )}

          {error && (
            <div className="bg-[color:var(--status-danger-bg)] text-[color:var(--status-danger-fg)] px-4 py-3 rounded-xl text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="url" className="block text-sm font-medium text-[color:var(--text-primary)] mb-1.5">
                Link
              </label>
              <input
                id="url"
                type="url"
                value={url}
                onChange={(e) => handleUrlChange(e.target.value)}
                placeholder="https://…"
                className="w-full px-4 py-3 rounded-xl border border-[color:var(--border-default)] bg-white focus:outline-none focus:ring-2 focus:ring-sky-400/40 focus:border-sky-400"
                autoFocus
                required
              />
              {(fetchingMetadata || aiLoading) && (
                <p className="text-xs text-secondary mt-1.5">Fetching preview…</p>
              )}
            </div>

            {(thumbnailUrl || title || locationLabel) && (
              <div className="flex gap-3 items-start rounded-xl bg-[color:var(--bg-subtle)] p-3 border border-[color:var(--border-subtle)]">
                {thumbnailUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={getProxiedImageUrl(thumbnailUrl) || thumbnailUrl}
                    alt=""
                    className="w-16 h-16 rounded-xl object-cover shrink-0"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-xl bg-fibi-brand-soft shrink-0" />
                )}
                <div className="min-w-0">
                  <p className="text-sm font-medium text-[color:var(--text-primary)] truncate">
                    {previewLabel}
                  </p>
                  {description && (
                    <p className="text-xs text-secondary mt-0.5 line-clamp-2">
                      {description}
                    </p>
                  )}
                  {locationLabel && (
                    <p className="text-xs text-sky-700 mt-0.5 truncate">{locationLabel}</p>
                  )}
                </div>
              </div>
            )}

            <div>
              <label htmlFor="notes" className="block text-sm font-medium text-[color:var(--text-primary)] mb-1.5">
                Note <span className="text-secondary font-normal">(optional)</span>
              </label>
              <input
                id="notes"
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Why you saved it"
                className="w-full px-4 py-3 rounded-xl border border-[color:var(--border-default)] bg-white focus:outline-none focus:border-sky-400"
              />
            </div>

            <Button type="submit" disabled={loading || !url.trim()} fullWidth size="lg">
              {loading ? 'Saving…' : 'Save'}
            </Button>

            {(!isAuthenticated || isAnonymous) && (
              <p className="text-xs text-secondary text-center">
                {isAnonymous
                  ? 'Your places are saved. '
                  : 'Saved on this device for now. '}
                <Link href="/signup?redirect=/app" className="text-sky-600 hover:underline">
                  Create an account
                </Link>{' '}
                to keep them.
              </p>
            )}
          </form>
        </Card>
      </main>
    </div>
  )
}
