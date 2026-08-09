'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useAuth } from '@/lib/useAuth'
import { createClient } from '@/lib/supabase/client'
import GooglePlacesInput from '@/components/GooglePlacesInput'
import type { TravelGuide, TravelGuidePlace, TravelGuideStatus } from '@/types/database'

type EditablePlace = {
  key: string
  name: string
  description: string
  section: string
  display_order: number
  latitude: number | null
  longitude: number | null
  formatted_address: string
  location_city: string
  location_country: string
  place_id: string
  source_url: string
  source_platform: string
  image_url: string
}

function emptyPlace(order: number): EditablePlace {
  return {
    key: `new_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    name: '',
    description: '',
    section: '',
    display_order: order,
    latitude: null,
    longitude: null,
    formatted_address: '',
    location_city: '',
    location_country: '',
    place_id: '',
    source_url: '',
    source_platform: '',
    image_url: '',
  }
}

function fromDbPlace(p: TravelGuidePlace): EditablePlace {
  return {
    key: p.id,
    name: p.name || '',
    description: p.description || '',
    section: p.section || '',
    display_order: p.display_order ?? 0,
    latitude: p.latitude,
    longitude: p.longitude,
    formatted_address: p.formatted_address || '',
    location_city: p.location_city || '',
    location_country: p.location_country || '',
    place_id: p.place_id || '',
    source_url: p.source_url || '',
    source_platform: p.source_platform || '',
    image_url: p.image_url || '',
  }
}

export default function AdminGuideEditorPage() {
  const router = useRouter()
  const routeParams = useParams()
  const guideId = typeof routeParams?.id === 'string' ? routeParams.id : null
  const { user, loading: authLoading } = useAuth()
  const [adminChecked, setAdminChecked] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)

  const [guide, setGuide] = useState<TravelGuide | null>(null)
  const [places, setPlaces] = useState<EditablePlace[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const getAuthHeaders = useCallback(async (): Promise<Record<string, string>> => {
    const supabase = createClient()
    const { data: { user: u } } = await supabase.auth.getUser()
    if (!u) return {}
    const { data: { session } } = await supabase.auth.getSession()
    if (session?.access_token) {
      return { Authorization: `Bearer ${session.access_token}` }
    }
    return {}
  }, [])

  useEffect(() => {
    if (authLoading || !user?.id) {
      if (!authLoading && !user) {
        router.replace(`/login?redirect=/app/admin/guides/${guideId || ''}`)
      }
      return
    }
    let cancelled = false
    Promise.resolve(
      createClient()
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()
    )
      .then(({ data, error: roleError }) => {
        if (cancelled) return
        setAdminChecked(true)
        setIsAdmin(!roleError && data?.role === 'admin')
      })
      .catch(() => {
        if (!cancelled) {
          setAdminChecked(true)
          setIsAdmin(false)
        }
      })
    return () => {
      cancelled = true
    }
  }, [authLoading, user, router, guideId])

  useEffect(() => {
    if (!adminChecked || isAdmin) return
    router.replace('/app')
  }, [adminChecked, isAdmin, router])

  useEffect(() => {
    if (!isAdmin || !guideId) return
    let cancelled = false
    ;(async () => {
      setLoading(true)
      try {
        const headers = await getAuthHeaders()
        const res = await fetch(`/api/admin/guides/${guideId}`, {
          credentials: 'include',
          headers,
        })
        if (!res.ok) throw new Error('Failed to load')
        const data = await res.json()
        if (cancelled) return
        setGuide(data.guide)
        setPlaces((data.places || []).map(fromDbPlace))
      } catch {
        if (!cancelled) setError("That didn't work. Try again.")
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [isAdmin, guideId, getAuthHeaders])

  const updateGuideField = <K extends keyof TravelGuide>(key: K, value: TravelGuide[K]) => {
    setGuide((g) => (g ? { ...g, [key]: value } : g))
  }

  const saveAll = async (statusOverride?: TravelGuideStatus) => {
    if (!guide || !guideId) return
    setSaving(true)
    setError(null)
    setMessage(null)
    try {
      const headers = await getAuthHeaders()
      const status = statusOverride || guide.status

      const guideRes = await fetch(`/api/admin/guides/${guideId}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: guide.title,
          slug: guide.slug,
          excerpt: guide.excerpt,
          introduction: guide.introduction,
          destination_name: guide.destination_name,
          city: guide.city,
          region: guide.region,
          country: guide.country,
          cover_image_url: guide.cover_image_url,
          seo_title: guide.seo_title,
          seo_description: guide.seo_description,
          author_name: guide.author_name,
          featured: guide.featured,
          status,
        }),
      })
      const guideData = await guideRes.json()
      if (!guideRes.ok) throw new Error(guideData.error || 'Failed to save guide')

      const placesRes = await fetch(`/api/admin/guides/${guideId}/places`, {
        method: 'PUT',
        credentials: 'include',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          places: places.map((p, index) => ({
            name: p.name,
            description: p.description || null,
            section: p.section || null,
            display_order: index,
            latitude: p.latitude,
            longitude: p.longitude,
            formatted_address: p.formatted_address || null,
            location_city: p.location_city || null,
            location_country: p.location_country || null,
            place_id: p.place_id || null,
            source_url: p.source_url || null,
            source_platform: p.source_platform || null,
            image_url: p.image_url || null,
          })),
        }),
      })
      const placesData = await placesRes.json()
      if (!placesRes.ok) throw new Error(placesData.error || 'Failed to save places')

      setGuide(guideData.guide)
      setPlaces((placesData.places || []).map(fromDbPlace))
      setMessage(status === 'published' ? 'Published.' : 'Saved.')
    } catch (err) {
      setError(err instanceof Error ? err.message : "That didn't work. Try again.")
    } finally {
      setSaving(false)
    }
  }

  const movePlace = (index: number, dir: -1 | 1) => {
    const next = index + dir
    if (next < 0 || next >= places.length) return
    setPlaces((prev) => {
      const copy = [...prev]
      const tmp = copy[index]
      copy[index] = copy[next]
      copy[next] = tmp
      return copy
    })
  }

  if (authLoading || !adminChecked || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-500">
        Loading…
      </div>
    )
  }

  if (!isAdmin || !guide) return null

  const inputClass =
    'mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-gray-500 focus:outline-none'
  const labelClass = 'block text-sm font-medium text-gray-700'

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <Link href="/app/admin/guides" className="text-sm text-gray-600 hover:text-gray-900">
              ← All guides
            </Link>
            <h1 className="mt-2 text-2xl font-bold text-gray-900">Edit guide</h1>
            <p className="text-sm text-gray-500 capitalize mt-1">Status: {guide.status}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {guide.status === 'published' && (
              <a
                href={`/travel-guides/${guide.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-2 text-sm border border-gray-300 text-gray-700 hover:bg-white"
              >
                Preview
              </a>
            )}
            <button
              type="button"
              disabled={saving}
              onClick={() => saveAll()}
              className="px-3 py-2 text-sm border border-gray-300 text-gray-700 hover:bg-white disabled:opacity-60"
            >
              Save
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={() => saveAll('published')}
              className="px-3 py-2 text-sm bg-gray-900 text-white hover:bg-gray-800 disabled:opacity-60"
            >
              Publish
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={() => saveAll('archived')}
              className="px-3 py-2 text-sm text-gray-600 hover:text-gray-900 disabled:opacity-60"
            >
              Archive
            </button>
          </div>
        </div>

        {(message || error) && (
          <p className={`text-sm ${error ? 'text-red-600' : 'text-green-700'}`}>
            {error || message}
          </p>
        )}

        <section className="bg-white shadow p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Guide</h2>

          <div>
            <label className={labelClass} htmlFor="title">Title</label>
            <input
              id="title"
              className={inputClass}
              value={guide.title}
              onChange={(e) => updateGuideField('title', e.target.value)}
            />
          </div>

          <div>
            <label className={labelClass} htmlFor="slug">Slug</label>
            <input
              id="slug"
              className={inputClass}
              value={guide.slug}
              onChange={(e) => updateGuideField('slug', e.target.value)}
            />
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass} htmlFor="destination">Destination name</label>
              <input
                id="destination"
                className={inputClass}
                value={guide.destination_name || ''}
                onChange={(e) => updateGuideField('destination_name', e.target.value)}
              />
            </div>
            <div>
              <label className={labelClass} htmlFor="country">Country</label>
              <input
                id="country"
                className={inputClass}
                value={guide.country || ''}
                onChange={(e) => updateGuideField('country', e.target.value)}
              />
            </div>
            <div>
              <label className={labelClass} htmlFor="city">City</label>
              <input
                id="city"
                className={inputClass}
                value={guide.city || ''}
                onChange={(e) => updateGuideField('city', e.target.value)}
              />
            </div>
            <div>
              <label className={labelClass} htmlFor="region">Region</label>
              <input
                id="region"
                className={inputClass}
                value={guide.region || ''}
                onChange={(e) => updateGuideField('region', e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className={labelClass} htmlFor="excerpt">Excerpt</label>
            <textarea
              id="excerpt"
              rows={2}
              className={inputClass}
              value={guide.excerpt || ''}
              onChange={(e) => updateGuideField('excerpt', e.target.value)}
            />
          </div>

          <div>
            <label className={labelClass} htmlFor="introduction">Introduction</label>
            <textarea
              id="introduction"
              rows={4}
              className={inputClass}
              value={guide.introduction || ''}
              onChange={(e) => updateGuideField('introduction', e.target.value)}
            />
          </div>

          <div>
            <label className={labelClass} htmlFor="cover">Cover image URL</label>
            <input
              id="cover"
              className={inputClass}
              value={guide.cover_image_url || ''}
              onChange={(e) => updateGuideField('cover_image_url', e.target.value)}
              placeholder="https://…"
            />
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass} htmlFor="seo_title">SEO title</label>
              <input
                id="seo_title"
                className={inputClass}
                value={guide.seo_title || ''}
                onChange={(e) => updateGuideField('seo_title', e.target.value)}
              />
            </div>
            <div>
              <label className={labelClass} htmlFor="author">Author</label>
              <input
                id="author"
                className={inputClass}
                value={guide.author_name || 'FIBI'}
                onChange={(e) => updateGuideField('author_name', e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className={labelClass} htmlFor="seo_description">SEO description</label>
            <textarea
              id="seo_description"
              rows={2}
              className={inputClass}
              value={guide.seo_description || ''}
              onChange={(e) => updateGuideField('seo_description', e.target.value)}
            />
          </div>

          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={guide.featured}
              onChange={(e) => updateGuideField('featured', e.target.checked)}
            />
            Featured on hub / homepage
          </label>
        </section>

        <section className="bg-white shadow p-6 space-y-6">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-lg font-semibold text-gray-900">Places</h2>
            <button
              type="button"
              onClick={() => setPlaces((prev) => [...prev, emptyPlace(prev.length)])}
              className="text-sm font-medium text-gray-900 hover:underline"
            >
              Add place
            </button>
          </div>

          {places.length === 0 && (
            <p className="text-sm text-gray-500">No places yet.</p>
          )}

          {places.map((place, index) => (
            <div key={place.key} className="border border-gray-200 p-4 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium text-gray-900">Place {index + 1}</p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => movePlace(index, -1)}
                    className="text-xs text-gray-500 hover:text-gray-900"
                  >
                    Up
                  </button>
                  <button
                    type="button"
                    onClick={() => movePlace(index, 1)}
                    className="text-xs text-gray-500 hover:text-gray-900"
                  >
                    Down
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setPlaces((prev) => prev.filter((_, i) => i !== index))
                    }
                    className="text-xs text-red-600 hover:underline"
                  >
                    Remove
                  </button>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Name</label>
                  <input
                    className={inputClass}
                    value={place.name}
                    onChange={(e) =>
                      setPlaces((prev) =>
                        prev.map((p, i) =>
                          i === index ? { ...p, name: e.target.value } : p
                        )
                      )
                    }
                  />
                </div>
                <div>
                  <label className={labelClass}>Section</label>
                  <input
                    className={inputClass}
                    placeholder="Beaches, Restaurants…"
                    value={place.section}
                    onChange={(e) =>
                      setPlaces((prev) =>
                        prev.map((p, i) =>
                          i === index ? { ...p, section: e.target.value } : p
                        )
                      )
                    }
                  />
                </div>
              </div>

              <div>
                <label className={labelClass}>Description</label>
                <textarea
                  rows={2}
                  className={inputClass}
                  value={place.description}
                  onChange={(e) =>
                    setPlaces((prev) =>
                      prev.map((p, i) =>
                        i === index ? { ...p, description: e.target.value } : p
                      )
                    )
                  }
                />
              </div>

              <div>
                <label className={labelClass}>Location</label>
                <div className="mt-1">
                  <GooglePlacesInput
                    value={place.name}
                    manualCity={place.location_city}
                    manualCountry={place.location_country}
                    onChange={(selected) => {
                      if (!selected) return
                      setPlaces((prev) =>
                        prev.map((p, i) =>
                          i === index
                            ? {
                                ...p,
                                name: p.name || selected.place_name,
                                place_id: selected.place_id,
                                latitude: selected.latitude,
                                longitude: selected.longitude,
                                formatted_address: selected.formatted_address,
                                location_city: selected.city || '',
                                location_country: selected.country || '',
                              }
                            : p
                        )
                      )
                    }}
                    onManualCityChange={(city) =>
                      setPlaces((prev) =>
                        prev.map((p, i) =>
                          i === index ? { ...p, location_city: city } : p
                        )
                      )
                    }
                    onManualCountryChange={(country) =>
                      setPlaces((prev) =>
                        prev.map((p, i) =>
                          i === index ? { ...p, location_country: country } : p
                        )
                      )
                    }
                  />
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Source URL</label>
                  <input
                    className={inputClass}
                    value={place.source_url}
                    onChange={(e) =>
                      setPlaces((prev) =>
                        prev.map((p, i) =>
                          i === index ? { ...p, source_url: e.target.value } : p
                        )
                      )
                    }
                  />
                </div>
                <div>
                  <label className={labelClass}>Source platform</label>
                  <input
                    className={inputClass}
                    placeholder="TikTok, Instagram, YouTube…"
                    value={place.source_platform}
                    onChange={(e) =>
                      setPlaces((prev) =>
                        prev.map((p, i) =>
                          i === index
                            ? { ...p, source_platform: e.target.value }
                            : p
                        )
                      )
                    }
                  />
                </div>
              </div>

              <div>
                <label className={labelClass}>Image URL</label>
                <input
                  className={inputClass}
                  value={place.image_url}
                  onChange={(e) =>
                    setPlaces((prev) =>
                      prev.map((p, i) =>
                        i === index ? { ...p, image_url: e.target.value } : p
                      )
                    )
                  }
                />
              </div>
            </div>
          ))}
        </section>

        <div className="flex justify-end gap-2 pb-12">
          <button
            type="button"
            disabled={saving}
            onClick={() => saveAll('draft')}
            className="px-4 py-2 text-sm border border-gray-300 disabled:opacity-60"
          >
            Save as draft
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={() => saveAll('published')}
            className="px-4 py-2 text-sm bg-gray-900 text-white disabled:opacity-60"
          >
            {saving ? 'Saving…' : 'Save & publish'}
          </button>
        </div>
      </div>
    </div>
  )
}
