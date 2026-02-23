'use client'

import { useEffect, useState, useMemo, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { SavedItem, CATEGORIES, Itinerary } from '@/types/database'
import { getHostname } from '@/lib/utils'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import MobileMenu from '@/components/MobileMenu'
import EmbedPreview from '@/components/EmbedPreview'

interface HomeGridProps {
  user: any
  confirmed?: boolean
}

export default function HomeGrid({ user, confirmed }: HomeGridProps) {
  const [items, setItems] = useState<SavedItem[]>([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({ categories: [] as string[] })
  const [showConfirmedMessage, setShowConfirmedMessage] = useState(confirmed || false)
  const [emailVerified, setEmailVerified] = useState<boolean | null>(null)
  const [showFirstPlaceFeedback, setShowFirstPlaceFeedback] = useState(false)
  const [showFilterModal, setShowFilterModal] = useState(false)
  const searchParams = useSearchParams()
  const [userCustomCategories, setUserCustomCategories] = useState<string[]>([])
  const [itineraries, setItineraries] = useState<Itinerary[]>([])
  const [showCalendarModal, setShowCalendarModal] = useState(false)
  const [selectedItemForCalendar, setSelectedItemForCalendar] = useState<SavedItem | null>(null)
  const [selectedItineraryId, setSelectedItineraryId] = useState<string | null>(null)
  const [savingCalendar, setSavingCalendar] = useState(false)
  const [failedScreenshotIds, setFailedScreenshotIds] = useState<Set<string>>(new Set())
  const [resendLoading, setResendLoading] = useState(false)
  const [resendMessage, setResendMessage] = useState<string | null>(null)
  const [sortOrder, setSortOrder] = useState<'default' | 'liked' | 'planned'>('default')
  const [groupBy, setGroupBy] = useState<'none' | 'liked' | 'planned'>('none')
  const supabase = createClient()
  const confirmError = searchParams?.get('confirm') === 'error'
  const confirmExpired = searchParams?.get('confirm') === 'expired'

  const handleResendConfirmation = async () => {
    const email = (user?.email && typeof user.email === 'string') ? user.email.trim() : ''
    if (!email) {
      setResendMessage('Email not available. Try the live site (fibi.world) or sign out and back in.')
      return
    }
    setResendLoading(true)
    setResendMessage(null)
    try {
      const res = await fetch('/api/auth/resend-confirm-email', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        // 401 on preview = Vercel Deployment Protection blocked the request
        if (res.status === 401) {
          throw new Error(
            "Request was blocked. If you're on a preview or staging link, try the live site (fibi.world) to resend, or check your original signup email for the confirm link."
          )
        }
        // Show server error (RESEND_API_KEY, Invalid `to`, config, etc.)
        throw new Error(typeof data?.error === 'string' ? data.error : `Failed to send (${res.status})`)
      }
      setResendMessage('Check your inbox for the link.')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Something went wrong. Try again or check your email.'
      setResendMessage(msg)
    } finally {
      setResendLoading(false)
    }
  }

  useEffect(() => {
    if (user) {
      loadItems()
      loadUserCustomOptions()
      loadItineraries()
      loadEmailVerified()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  const loadEmailVerified = async () => {
    if (!user?.id) return
    try {
      const { data } = await supabase
        .from('profiles')
        .select('email_verified_at')
        .eq('id', user.id)
        .single()
      setEmailVerified(data?.email_verified_at != null)
    } catch {
      setEmailVerified(null)
    }
  }

  // When user just confirmed email, refresh verified state
  useEffect(() => {
    if (confirmed && user) {
      setEmailVerified(true)
      loadEmailVerified()
    }
  }, [confirmed, user?.id])

  // Show "Nice start." when returning after adding first place
  useEffect(() => {
    const fromStorage = typeof window !== 'undefined' && sessionStorage.getItem('firstPlaceAdded')
    const fromQuery = searchParams?.get('firstPlace') === '1'
    if (fromStorage || fromQuery) {
      setShowFirstPlaceFeedback(true)
      if (typeof window !== 'undefined') sessionStorage.removeItem('firstPlaceAdded')
      if (fromQuery && typeof window !== 'undefined') {
        window.history.replaceState({}, '', '/app')
      }
      const t = setTimeout(() => setShowFirstPlaceFeedback(false), 3000)
      return () => clearTimeout(t)
    }
  }, [searchParams])

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
        if (session?.user) {
          loadItems()
        }
      }
    })
    return () => subscription.unsubscribe()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const loadItems = async () => {
    if (!user) return

    try {
      const { data, error } = await supabase
        .from('saved_items')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error loading items:', error)
        setItems([])
      } else {
        setItems(data || [])
      }
    } catch (error) {
      console.error('Error loading items:', error)
      setItems([])
    } finally {
      setLoading(false)
    }
  }

  // Load user's custom categories
  const loadUserCustomOptions = async () => {
    if (!user) return

    try {
      const { data: categories, error: catError } = await supabase
        .from('user_custom_options')
        .select('value')
        .eq('user_id', user.id)
        .eq('type', 'category')
        .order('created_at', { ascending: false })

      if (catError) console.error('Error loading custom categories:', catError)
      if (categories) {
        setUserCustomCategories(categories.map(c => c.value))
      }
    } catch (err) {
      console.error('Error loading custom options:', err)
    }
  }

  // Load itineraries
  const loadItineraries = async () => {
    if (!user) return

    try {
      const { data, error } = await supabase
        .from('itineraries')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error loading itineraries:', error)
        setItineraries([])
      } else {
        setItineraries(data || [])
      }
    } catch (error) {
      console.error('Error loading itineraries:', error)
      setItineraries([])
    }
  }

  const handleSignOut = () => {
    window.location.href = '/api/auth/signout'
  }

  // Parse categories/statuses from item (supports both single string and array)
  const parseItemField = (field: string | null): string[] => {
    if (!field) return []
    if (Array.isArray(field)) return field
    try {
      const parsed = JSON.parse(field)
      if (Array.isArray(parsed)) return parsed
    } catch {}
    return [field]
  }

  // Calculate usage counts and sort options by popularity
  const { sortedCategories, sortedUserCustomCategories } = useMemo(() => {
    const categoryCounts: Record<string, number> = {}

    items.forEach((item) => {
      parseItemField(item.category).forEach((cat) => {
        categoryCounts[cat] = (categoryCounts[cat] || 0) + 1
      })
    })

    const sortByPopularity = (arr: string[], counts: Record<string, number>) =>
      [...arr].sort((a, b) => {
        const diff = (counts[b] || 0) - (counts[a] || 0)
        return diff !== 0 ? diff : a.localeCompare(b)
      })

    return {
      sortedCategories: sortByPopularity([...CATEGORIES], categoryCounts),
      sortedUserCustomCategories: sortByPopularity([...userCustomCategories], categoryCounts),
    }
  }, [items, userCustomCategories])

  // Filter items based on selected filters
  const filteredItems = useMemo(() => {
    if (filters.categories.length === 0) return items
    return items.filter((item) => {
      const itemCategories = parseItemField(item.category)
      return filters.categories.some(cat => itemCategories.includes(cat))
    })
  }, [items, filters])

  // Order items: sort by liked/planned, optional group (group off by default)
  const orderedItems = useMemo(() => {
    let list = [...filteredItems]
    if (groupBy === 'liked') {
      const liked = list.filter((i) => i.liked)
      const rest = list.filter((i) => !i.liked)
      list = [...liked, ...rest]
    } else if (groupBy === 'planned') {
      const planned = list.filter((i) => i.planned)
      const rest = list.filter((i) => !i.planned)
      list = [...planned, ...rest]
    }
    if (sortOrder === 'liked') {
      const liked = list.filter((i) => i.liked)
      const rest = list.filter((i) => !i.liked)
      list = [...liked, ...rest]
    } else if (sortOrder === 'planned') {
      const planned = list.filter((i) => i.planned)
      const rest = list.filter((i) => !i.planned)
      list = [...planned, ...rest]
    }
    return list
  }, [filteredItems, sortOrder, groupBy])

  const activeFiltersCount = filters.categories.length

  const toggleFilter = (category: string) => {
    setFilters(prev => ({
      ...prev,
      categories: prev.categories.includes(category)
        ? prev.categories.filter(v => v !== category)
        : [...prev.categories, category]
    }))
  }

  const clearFilters = () => {
    setFilters({ categories: [] })
  }

  // Toggle liked or planned on an item
  const handleToggleIcon = async (item: SavedItem, field: 'liked' | 'planned') => {
    const newVal = !(item[field] ?? false)
    try {
      const { error } = await supabase
        .from('saved_items')
        .update({ [field]: newVal })
        .eq('id', item.id)

      if (error) throw error
      setItems((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, [field]: newVal } : i))
      )
    } catch (err) {
      console.error('Error toggling', field, err)
    }
  }

  // Handle item click - show Add to Trip modal
  const handleItemClick = (e: React.MouseEvent, item: SavedItem) => {
    e.preventDefault()
    setSelectedItemForCalendar(item)
    setSelectedItineraryId(item.itinerary_id || null)
    setShowCalendarModal(true)
  }

  // Handle saving trip assignment (no per-place dates)
  const handleSaveCalendar = async () => {
    if (!selectedItemForCalendar) return

    setSavingCalendar(true)
    try {
      const updateData: {
        itinerary_id: string | null
        trip_position: number | null
      } = {
        itinerary_id: selectedItineraryId,
        trip_position: null,
      }

      if (selectedItineraryId) {
        const { data: maxRow } = await supabase
          .from('saved_items')
          .select('trip_position')
          .eq('itinerary_id', selectedItineraryId)
          .order('trip_position', { ascending: false })
          .limit(1)
          .maybeSingle()
        updateData.trip_position = maxRow?.trip_position != null ? maxRow.trip_position + 1 : 0
      }

      const { error } = await supabase
        .from('saved_items')
        .update(updateData)
        .eq('id', selectedItemForCalendar.id)

      if (error) throw error

      // Update local state
      setItems((prev) =>
        prev.map((item) =>
          item.id === selectedItemForCalendar.id
            ? {
                ...item,
                itinerary_id: selectedItineraryId,
                trip_position: updateData.trip_position,
              }
            : item
        )
      )

      setShowCalendarModal(false)
      setSelectedItemForCalendar(null)
      setSelectedItineraryId(null)
    } catch (error) {
      console.error('Error saving trip assignment:', error)
      alert('Failed to save trip assignment. Please try again.')
    } finally {
      setSavingCalendar(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header - Mobile only */}
      <header className="md:hidden bg-white sticky top-0 z-20 shadow-soft">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-charcoal">FiBi</h1>
              <span className="text-[10px] font-medium text-secondary border border-gray-200 rounded-full px-2 py-0.5 bg-gray-50/80">
                Early Access
              </span>
            </div>
            <div className="flex items-center gap-2">
              {items.length > 0 && (
                <button
                  onClick={() => setShowFilterModal(true)}
                  className="relative px-3 py-1.5 text-sm font-medium text-gray-700 hover:text-gray-900"
                >
                  Filter
                  {activeFiltersCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-gray-900 text-white text-xs rounded-full flex items-center justify-center">
                      {activeFiltersCount}
                    </span>
                  )}
                </button>
              )}
              <Link
                href="/app/add"
                className="bg-charcoal text-white px-4 py-2 rounded-xl text-sm font-medium hover:opacity-90 shadow-soft"
              >
                Add
              </Link>
              <MobileMenu isAuthenticated={!!user} onSignOut={handleSignOut} />
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-12 pb-24 md:pb-12">
        {showFirstPlaceFeedback && (
          <p
            className="mb-6 text-secondary font-normal animate-[fadeIn_0.4s_ease-out]"
            role="status"
            aria-live="polite"
          >
            Nice start.
          </p>
        )}
        {showConfirmedMessage && (
          <div className="mb-6 bg-green-50 text-green-700 px-4 py-3 rounded-2xl shadow-soft flex items-center justify-between">
            <span>✓ Email confirmed! You&apos;re all set.</span>
            <button
              onClick={() => setShowConfirmedMessage(false)}
              className="text-green-700 hover:text-green-900 ml-4"
            >
              ✕
            </button>
          </div>
        )}
        {emailVerified === false && !showConfirmedMessage && (
          <div className="mb-6 bg-amber-50 text-amber-800 px-4 py-3 rounded-2xl shadow-soft flex items-center justify-between flex-wrap gap-2">
            <span className="flex-1 min-w-0">
              {resendMessage ?? 'Please confirm your email to get travel tips and updates. Check your inbox for the link.'}
            </span>
            <div className="flex items-center gap-3 flex-shrink-0">
              <button
                onClick={handleResendConfirmation}
                disabled={resendLoading}
                className="text-amber-700 hover:text-amber-900 text-sm font-medium underline disabled:opacity-50"
                aria-label="Resend confirmation email"
              >
                {resendLoading ? 'Sending…' : 'Resend'}
              </button>
              <button
                onClick={() => setEmailVerified(true)}
                className="text-amber-700 hover:text-amber-900 text-sm underline"
                aria-label="Dismiss"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}
        {confirmError && (
          <div className="mb-6 bg-red-50 text-red-700 px-4 py-3 rounded-2xl shadow-soft">
            Something went wrong confirming your email. You can ignore this or try signing up again.
          </div>
        )}
        {confirmExpired && (
          <div className="mb-6 bg-amber-50 text-amber-800 px-4 py-3 rounded-2xl shadow-soft">
            Confirmation link expired. Check your inbox for a new one or sign up again.
          </div>
        )}

        {/* Filters - Desktop: horizontal chips, Mobile: modal */}
        {items.length > 0 && (
          <div className="mb-6 md:mb-8 hidden md:block">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-medium text-secondary">Category:</span>
                <button
                  onClick={() => setFilters(prev => ({ ...prev, categories: [] }))}
                  className={`px-3 py-1.5 text-sm rounded-xl ${
                    filters.categories.length === 0
                      ? 'bg-charcoal text-white'
                      : 'bg-gray-100 text-secondary hover:bg-gray-200'
                  }`}
                >
                  All
                </button>
                {[...sortedCategories, ...sortedUserCustomCategories].map((category) => (
                  <button
                    key={category}
                    onClick={() => toggleFilter(category)}
                    className={`px-3 py-1.5 text-sm rounded-xl ${
                      filters.categories.includes(category)
                        ? 'bg-charcoal text-white'
                        : 'bg-gray-100 text-secondary hover:bg-gray-200'
                    }`}
                  >
                    {category}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2 flex-wrap border-l border-gray-200 pl-3 ml-1">
                <span className="text-sm font-medium text-secondary">Sort:</span>
                <select
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value as 'default' | 'liked' | 'planned')}
                  className="px-2.5 py-1.5 text-sm rounded-xl bg-gray-100 text-secondary hover:bg-gray-200 border-0 focus:ring-2 focus:ring-charcoal/20"
                  aria-label="Sort order"
                >
                  <option value="default">Default</option>
                  <option value="liked">Liked first</option>
                  <option value="planned">Planned first</option>
                </select>
                <span className="text-sm font-medium text-secondary">Group:</span>
                <select
                  value={groupBy}
                  onChange={(e) => setGroupBy(e.target.value as 'none' | 'liked' | 'planned')}
                  className="px-2.5 py-1.5 text-sm rounded-xl bg-gray-100 text-secondary hover:bg-gray-200 border-0 focus:ring-2 focus:ring-charcoal/20"
                  aria-label="Group by"
                >
                  <option value="none">None</option>
                  <option value="liked">Liked</option>
                  <option value="planned">Planned</option>
                </select>
              </div>
              {activeFiltersCount > 0 && (
                <button
                  onClick={clearFilters}
                  className="text-sm text-secondary hover:text-charcoal"
                >
                  Clear all
                </button>
              )}
            </div>
          </div>
        )}

        {/* Empty state */}
        {!loading && filteredItems.length === 0 && (
          <div className="max-w-3xl mx-auto relative">
            {/* Subtle background visual - low opacity map-like pattern */}
            <div
              className="absolute inset-0 pointer-events-none opacity-[0.08]"
              aria-hidden
            >
              <svg className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <pattern id="map-dots" x="0" y="0" width="24" height="24" patternUnits="userSpaceOnUse">
                    <circle cx="4" cy="4" r="0.5" fill="currentColor" />
                    <circle cx="16" cy="12" r="0.5" fill="currentColor" />
                    <circle cx="8" cy="20" r="0.5" fill="currentColor" />
                    <circle cx="20" cy="6" r="0.5" fill="currentColor" />
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#map-dots)" />
              </svg>
            </div>
            {items.length > 0 && activeFiltersCount > 0 ? (
              <div className="text-center py-14 md:py-20 relative">
                <h2 className="text-xl md:text-2xl font-medium text-charcoal mb-2">
                  No places match your filters
                </h2>
                <p className="text-base text-secondary mb-6 leading-relaxed">
                  Try adjusting your filters to see more results.
                </p>
                <button
                  onClick={clearFilters}
                  className="inline-block bg-charcoal text-white px-6 py-2.5 rounded-xl text-sm font-medium hover:opacity-90 shadow-soft"
                >
                  Clear all filters
                </button>
              </div>
            ) : (
              <div className="text-center py-14 md:py-20 relative">
                <h2 className="text-2xl md:text-3xl font-medium text-charcoal mb-3 leading-tight">
                  Start building your next trip.
                </h2>
                <p className="text-base md:text-lg text-secondary mb-8 leading-relaxed max-w-md mx-auto">
                  Save places you don&apos;t want to forget and keep them organised.
                </p>
                <Link
                  href="/app/add"
                  className="inline-block bg-charcoal text-white px-8 py-3 rounded-xl font-medium hover:opacity-90 shadow-soft mb-4"
                >
                  Add your first place
                </Link>
                <Link
                  href="/app/calendar"
                  className="block text-sm text-secondary hover:text-charcoal transition-colors"
                >
                  Create a trip
                </Link>
              </div>
            )}
          </div>
        )}

        {/* Loading state */}
        {loading && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
            {[...Array(10)].map((_, i) => (
              <div key={i} className="aspect-[4/5] bg-white rounded-2xl overflow-hidden shadow-sm animate-pulse border border-gray-100 flex flex-col">
                <div className="flex-1 min-h-0 bg-gray-200" />
                <div className="px-3 py-2 border-t border-gray-100">
                  <div className="h-4 bg-gray-200 rounded w-3/4" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Grid */}
        {!loading && orderedItems.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
            {orderedItems.map((item) => {
              const displayTitle = item.title || getHostname(item.url)
              const itemCategories = parseItemField(item.category)
              const oneCategory = itemCategories[0]
              const isLiked = item.liked ?? false
              const isPlanned = item.planned ?? false
              const both = isLiked && isPlanned

              return (
                <div
                  key={item.id}
                  className="aspect-[4/5] bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md hover:border-gray-200 border border-gray-100 transition-all flex flex-col relative group"
                >
                  <Link href={`/item/${item.id}`} className="flex flex-col flex-1 min-h-0">
                    <div className="flex-1 min-h-0 bg-gray-50 relative overflow-hidden">
                      {item.screenshot_url && !failedScreenshotIds.has(item.id) ? (
                        <img
                          src={item.screenshot_url}
                          alt={displayTitle}
                          className="absolute inset-0 w-full h-full object-cover"
                          loading="lazy"
                          onError={() => setFailedScreenshotIds((prev) => new Set(prev).add(item.id))}
                        />
                      ) : (
                        <div className="absolute inset-0">
                          <EmbedPreview
                            url={item.url}
                            thumbnailUrl={item.thumbnail_url}
                            platform={item.platform}
                            displayTitle={displayTitle}
                          />
                        </div>
                      )}
                      {/* Top-right overlay: state icons (only when active) + add-to-trip */}
                      <div className="absolute top-2 right-2 flex items-center gap-1.5 z-10">
                        {/* Planned (tick): primary when both, 24px circle */}
                        {isPlanned && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault()
                              e.stopPropagation()
                              handleToggleIcon(item, 'planned')
                            }}
                            className="flex items-center justify-center w-6 h-6 rounded-full bg-black/50 text-white transition-transform duration-200 hover:scale-110 active:scale-95 animate-[scale-in_0.25s_ease-out]"
                            aria-label="Remove planned"
                          >
                            <svg className={both ? 'w-5 h-5' : 'w-5 h-5'} fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          </button>
                        )}
                        {/* Liked (heart): smaller when both */}
                        {isLiked && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault()
                              e.stopPropagation()
                              handleToggleIcon(item, 'liked')
                            }}
                            className={`flex items-center justify-center rounded-full bg-black/50 text-white transition-transform duration-200 hover:scale-110 active:scale-95 animate-[scale-in_0.25s_ease-out] ${
                              both ? 'w-5 h-5' : 'w-6 h-6'
                            }`}
                            style={{ minWidth: both ? 20 : 24, minHeight: both ? 20 : 24 }}
                            aria-label="Remove liked"
                          >
                            <svg className={both ? 'w-3.5 h-3.5' : 'w-5 h-5'} fill="currentColor" viewBox="0 0 24 24">
                              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                            </svg>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            handleItemClick(e as unknown as React.MouseEvent, item)
                          }}
                          className="p-2 rounded-xl bg-white/90 hover:bg-white shadow-soft text-secondary hover:text-charcoal transition-colors"
                          aria-label="Add to trip"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </button>
                      </div>
                      <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded-md bg-white/80 text-secondary text-xs font-normal backdrop-blur-sm">
                        {item.platform}
                      </div>
                    </div>

                    <div className="px-3 py-2 flex-shrink-0 border-t border-gray-100 min-h-0">
                      <h3 className="font-medium text-charcoal truncate text-sm">
                        {displayTitle}
                      </h3>
                      {(item.place_name || item.formatted_address || item.location_city || item.location_country) && (
                        <p className="text-xs text-secondary truncate mt-0.5">
                          {item.place_name || item.formatted_address || [item.location_city, item.location_country].filter(Boolean).join(', ')}
                        </p>
                      )}
                      {oneCategory && (
                        <p className="text-xs text-secondary truncate mt-0.5">{oneCategory}</p>
                      )}
                    </div>
                  </Link>
                </div>
              )
            })}
          </div>
        )}
      </main>

      {/* Floating Add Button - Mobile only */}
      <Link
        href="/app/add"
        className="fixed bottom-6 right-6 md:hidden z-30 bg-charcoal text-white w-14 h-14 rounded-2xl shadow-soft-md hover:opacity-90 transition-opacity flex items-center justify-center"
        aria-label="Add place"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
      </Link>

      {/* Filter Modal - Mobile only */}
      {showFilterModal && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setShowFilterModal(false)}
        >
          <div 
            className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl shadow-soft-md max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white px-4 py-4 flex items-center justify-between shadow-soft">
              <h2 className="text-lg font-medium text-charcoal">Filter</h2>
              <button
                onClick={() => setShowFilterModal(false)}
                className="text-secondary hover:text-charcoal"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="p-4 space-y-6">
              <div>
                <h3 className="text-xs font-medium text-secondary mb-3">Category</h3>
                <div className="overflow-x-auto pb-2 -mx-2 px-2">
                  <div className="flex gap-2 min-w-max">
                    <button
                      onClick={() => setFilters(prev => ({ ...prev, categories: [] }))}
                      className={`px-3 py-1.5 rounded-xl text-sm font-medium whitespace-nowrap ${
                        filters.categories.length === 0
                          ? 'bg-charcoal text-white'
                          : 'bg-gray-100 text-secondary hover:bg-gray-200'
                      }`}
                    >
                      All
                    </button>
                    {[...sortedCategories, ...sortedUserCustomCategories].map((category) => (
                      <button
                        key={category}
                        onClick={() => toggleFilter(category)}
                        className={`px-3 py-1.5 rounded-xl text-sm font-medium whitespace-nowrap ${
                          filters.categories.includes(category)
                            ? 'bg-charcoal text-white'
                            : 'bg-gray-100 text-secondary hover:bg-gray-200'
                        }`}
                      >
                        {category}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-xs font-medium text-secondary mb-2">Sort</h3>
                <select
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value as 'default' | 'liked' | 'planned')}
                  className="w-full px-3 py-2 text-sm rounded-xl bg-gray-100 text-secondary border-0"
                  aria-label="Sort order"
                >
                  <option value="default">Default</option>
                  <option value="liked">Liked first</option>
                  <option value="planned">Planned first</option>
                </select>
              </div>
              <div>
                <h3 className="text-xs font-medium text-secondary mb-2">Group by</h3>
                <select
                  value={groupBy}
                  onChange={(e) => setGroupBy(e.target.value as 'none' | 'liked' | 'planned')}
                  className="w-full px-3 py-2 text-sm rounded-xl bg-gray-100 text-secondary border-0"
                  aria-label="Group by"
                >
                  <option value="none">None</option>
                  <option value="liked">Liked</option>
                  <option value="planned">Planned</option>
                </select>
              </div>

              <div className="pt-4 space-y-2">
                {activeFiltersCount > 0 && (
                  <button
                    onClick={clearFilters}
                    className="w-full px-4 py-2.5 text-sm font-medium text-secondary hover:text-charcoal rounded-xl hover:bg-gray-50"
                  >
                    Clear filters
                  </button>
                )}
                <button
                  onClick={() => setShowFilterModal(false)}
                  className="w-full bg-charcoal text-white py-3 rounded-xl font-medium hover:opacity-90 shadow-soft"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add to Trip Modal */}
      {showCalendarModal && selectedItemForCalendar && (
        <AddToTripModal
          item={selectedItemForCalendar}
          itineraries={itineraries}
          selectedItineraryId={selectedItineraryId}
          onItineraryChange={setSelectedItineraryId}
          onSave={handleSaveCalendar}
          onClose={() => {
            setShowCalendarModal(false)
            setSelectedItemForCalendar(null)
            setSelectedItineraryId(null)
          }}
          saving={savingCalendar}
        />
      )}
    </div>
  )
}

// Add to Trip Modal Component
interface AddToTripModalProps {
  item: SavedItem
  itineraries: Itinerary[]
  selectedItineraryId: string | null
  onItineraryChange: (id: string | null) => void
  onSave: () => void
  onClose: () => void
  saving: boolean
}

function AddToTripModal({
  item,
  itineraries,
  selectedItineraryId,
  onItineraryChange,
  onSave,
  onClose,
  saving,
}: AddToTripModalProps) {
  const [showCreateItinerary, setShowCreateItinerary] = useState(false)
  const [newItineraryName, setNewItineraryName] = useState('')
  const [creatingItinerary, setCreatingItinerary] = useState(false)
  const supabase = createClient()

  // Close on backdrop click
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  // Close on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [onClose])

  const handleCreateItinerary = async () => {
    if (!newItineraryName.trim()) return

    setCreatingItinerary(true)
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) return

      const { data, error } = await supabase
        .from('itineraries')
        .insert({
          user_id: user.id,
          name: newItineraryName.trim(),
        })
        .select()
        .single()

      if (error) throw error

      if (data) {
        onItineraryChange(data.id)
        setShowCreateItinerary(false)
        setNewItineraryName('')
      }
    } catch (error) {
      console.error('Error creating trip:', error)
      alert('Failed to create trip. Please try again.')
    } finally {
      setCreatingItinerary(false)
    }
  }

  const displayTitle = item.title || getHostname(item.url)
  const parseField = (field: string | null): string[] => {
    if (!field) return []
    try {
      const parsed = JSON.parse(field)
      if (Array.isArray(parsed)) return parsed
    } catch {}
    return [field]
  }
  const modalCategories = parseField(item.category)
  const rawModalSummary = [item.description, item.notes].filter(Boolean).join(' ').trim()
  const modalSummary = rawModalSummary ? rawModalSummary.slice(0, 160) + (rawModalSummary.length > 160 ? '…' : '') : ''
  const getPlatformStyle = (platform: string) => {
    const styles: Record<string, string> = {
      TikTok: 'bg-black text-white',
      Instagram: 'bg-gradient-to-r from-purple-500 to-pink-500 text-white',
      YouTube: 'bg-red-600 text-white',
    }
    return styles[platform] || 'bg-gray-700 text-white'
  }

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-end md:items-center justify-center z-50 p-4"
      onClick={handleBackdropClick}
    >
      <div className="bg-white rounded-t-2xl md:rounded-2xl max-w-md w-full max-h-[90vh] overflow-hidden shadow-xl flex flex-col">
        {/* Header */}
        <div className="p-5 border-b border-gray-200 flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-semibold text-gray-900">Add to Trip</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors ml-2 flex-shrink-0"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {/* Place preview (same as home page card) */}
          <div className="rounded-xl overflow-hidden border border-gray-200 bg-gray-50">
            <div className="aspect-[4/3] relative overflow-hidden">
              {item.screenshot_url ? (
                <>
                  <img
                    src={item.screenshot_url}
                    alt={displayTitle}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-2 left-2 px-1.5 py-0.5 bg-black/70 text-white text-xs rounded">
                    Screenshot
                  </div>
                </>
              ) : (
                <EmbedPreview
                  url={item.url}
                  thumbnailUrl={item.thumbnail_url}
                  platform={item.platform}
                  displayTitle={displayTitle}
                />
              )}
              <div className={`absolute bottom-2 left-2 px-2 py-1 rounded text-xs font-medium ${getPlatformStyle(item.platform)}`}>
                {item.platform}
              </div>
            </div>
            <div className="p-3 space-y-2">
              <h3 className="font-medium text-gray-900 text-sm line-clamp-2">{displayTitle}</h3>
              {(item.location_city || item.location_country) && (
                <p className="text-xs text-gray-600">
                  {[item.location_city, item.location_country].filter(Boolean).join(', ')}
                </p>
              )}
              {(modalCategories.length > 0 || item.liked || item.planned) && (
                <div className="flex flex-wrap gap-1.5 items-center">
                  {modalCategories.map((cat, idx) => (
                    <span key={`c-${idx}`} className="px-2 py-0.5 rounded bg-gray-100 text-gray-600 text-xs">
                      {cat}
                    </span>
                  ))}
                  {item.liked && (
                    <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-black/10 text-gray-700 text-xs" title="Liked">
                      <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" /></svg>
                    </span>
                  )}
                  {item.planned && (
                    <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-black/10 text-gray-700 text-xs" title="Planned">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                    </span>
                  )}
                </div>
              )}
              {modalSummary && (
                <p className="text-xs text-gray-500 line-clamp-2">
                  {modalSummary}
                </p>
              )}
              <Link
                href={`/item/${item.id}`}
                className="inline-block text-xs font-medium text-gray-600 hover:text-gray-900 pt-1"
              >
                View full place →
              </Link>
            </div>
          </div>

          {/* Trip selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Trip
            </label>
            <div className="space-y-2">
              <select
                value={selectedItineraryId || ''}
                onChange={(e) => onItineraryChange(e.target.value || null)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:ring-2 focus:ring-gray-900 focus:border-gray-900 bg-white"
              >
                <option value="">No trip</option>
                {itineraries.map((itinerary) => (
                  <option key={itinerary.id} value={itinerary.id}>
                    {itinerary.name}
                  </option>
                ))}
              </select>
              {!showCreateItinerary ? (
                <button
                  onClick={() => setShowCreateItinerary(true)}
                  className="w-full px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  + Create new trip
                </button>
              ) : (
                <div className="space-y-2">
                  <input
                    type="text"
                    value={newItineraryName}
                    onChange={(e) => setNewItineraryName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && newItineraryName.trim()) {
                        handleCreateItinerary()
                      }
                    }}
                    placeholder="Trip name"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:ring-2 focus:ring-gray-900 focus:border-gray-900"
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleCreateItinerary}
                      disabled={!newItineraryName.trim() || creatingItinerary}
                      className="flex-1 px-4 py-2 text-sm font-medium bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {creatingItinerary ? 'Creating...' : 'Create'}
                    </button>
                    <button
                      onClick={() => {
                        setShowCreateItinerary(false)
                        setNewItineraryName('')
                      }}
                      className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="border-t border-gray-200 p-5 bg-gray-50 space-y-3">
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-white transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={onSave}
              disabled={saving}
              className="flex-1 bg-gray-900 text-white py-3 px-4 rounded-lg font-medium hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
          <p className="text-center text-xs text-gray-500">
            Manage trips in the{' '}
            <Link href="/app/calendar" className="font-medium text-gray-700 hover:text-gray-900">
              Planner
            </Link>
            .
          </p>
        </div>
      </div>
    </div>
  )
}
