'use client'

import { useEffect, useState, useMemo, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { SavedItem, CATEGORIES, STATUSES, Itinerary } from '@/types/database'
import { getHostname } from '@/lib/utils'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import MobileMenu from '@/components/MobileMenu'
import EmbedPreview from '@/components/EmbedPreview'

interface HomeGridProps {
  user: any
  confirmed?: boolean
}

export default function HomeGrid({ user, confirmed }: HomeGridProps) {
  const [items, setItems] = useState<SavedItem[]>([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({ categories: [] as string[], statuses: [] as string[] })
  const [showConfirmedMessage, setShowConfirmedMessage] = useState(confirmed || false)
  const [emailVerified, setEmailVerified] = useState<boolean | null>(null)
  const [showFirstPlaceFeedback, setShowFirstPlaceFeedback] = useState(false)
  const [showFilterModal, setShowFilterModal] = useState(false)
  const searchParams = useSearchParams()
  const [userCustomCategories, setUserCustomCategories] = useState<string[]>([])
  const [userCustomStatuses, setUserCustomStatuses] = useState<string[]>([])
  const [itineraries, setItineraries] = useState<Itinerary[]>([])
  const [showCalendarModal, setShowCalendarModal] = useState(false)
  const [selectedItemForCalendar, setSelectedItemForCalendar] = useState<SavedItem | null>(null)
  const [selectedItineraryId, setSelectedItineraryId] = useState<string | null>(null)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [viewMonth, setViewMonth] = useState(new Date())
  const [savingCalendar, setSavingCalendar] = useState(false)
  const supabase = createClient()
  const router = useRouter()
  const confirmError = searchParams?.get('confirm') === 'error'
  const confirmExpired = searchParams?.get('confirm') === 'expired'

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

  // Load user's custom categories and statuses
  const loadUserCustomOptions = async () => {
    if (!user) return

    try {
      const { data: categories, error: catError } = await supabase
        .from('user_custom_options')
        .select('value')
        .eq('user_id', user.id)
        .eq('type', 'category')
        .order('created_at', { ascending: false })

      const { data: statuses, error: statusError } = await supabase
        .from('user_custom_options')
        .select('value')
        .eq('user_id', user.id)
        .eq('type', 'status')
        .order('created_at', { ascending: false })

      if (catError) console.error('Error loading custom categories:', catError)
      if (statusError) console.error('Error loading custom statuses:', statusError)

      if (categories) {
        setUserCustomCategories(categories.map(c => c.value))
      }
      if (statuses) {
        setUserCustomStatuses(statuses.map(s => s.value))
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

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
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
  const { sortedCategories, sortedStatuses, sortedUserCustomCategories, sortedUserCustomStatuses } = useMemo(() => {
    const categoryCounts: Record<string, number> = {}
    const statusCounts: Record<string, number> = {}

    items.forEach((item) => {
      parseItemField(item.category).forEach((cat) => {
        categoryCounts[cat] = (categoryCounts[cat] || 0) + 1
      })
      parseItemField(item.status).forEach((stat) => {
        statusCounts[stat] = (statusCounts[stat] || 0) + 1
      })
    })

    const sortByPopularity = (arr: string[], counts: Record<string, number>) =>
      [...arr].sort((a, b) => {
        const diff = (counts[b] || 0) - (counts[a] || 0)
        return diff !== 0 ? diff : a.localeCompare(b)
      })

    return {
      sortedCategories: sortByPopularity([...CATEGORIES], categoryCounts),
      sortedStatuses: sortByPopularity([...STATUSES], statusCounts),
      sortedUserCustomCategories: sortByPopularity([...userCustomCategories], categoryCounts),
      sortedUserCustomStatuses: sortByPopularity([...userCustomStatuses], statusCounts),
    }
  }, [items, userCustomCategories, userCustomStatuses])

  // Filter items based on selected filters
  const filteredItems = useMemo(() => {
    if (filters.categories.length === 0 && filters.statuses.length === 0) return items
    
    return items.filter((item) => {
      const itemCategories = parseItemField(item.category)
      const itemStatuses = parseItemField(item.status)
      
      if (filters.categories.length > 0 && !filters.categories.some(cat => itemCategories.includes(cat))) {
        return false
      }
      if (filters.statuses.length > 0 && !filters.statuses.some(status => itemStatuses.includes(status))) {
        return false
      }
      return true
    })
  }, [items, filters])

  const activeFiltersCount = filters.categories.length + filters.statuses.length

  const toggleFilter = (type: 'categories' | 'statuses', value: string) => {
    setFilters(prev => ({
      ...prev,
      [type]: prev[type].includes(value)
        ? prev[type].filter(v => v !== value)
        : [...prev[type], value]
    }))
  }

  const clearFilters = () => {
    setFilters({ categories: [], statuses: [] })
  }

  // Handle item click - show calendar assignment modal (default to today for context)
  const handleItemClick = (e: React.MouseEvent, item: SavedItem) => {
    e.preventDefault()
    setSelectedItemForCalendar(item)
    setSelectedItineraryId(item.itinerary_id || null)
    setSelectedDate(item.planned_date ? new Date(item.planned_date) : null)
    setViewMonth(new Date()) // Default to today so user sees current context
    setShowCalendarModal(true)
  }

  // Handle saving calendar assignment
  const handleSaveCalendar = async () => {
    if (!selectedItemForCalendar) return

    setSavingCalendar(true)
    try {
      const dateStr = selectedDate ? selectedDate.toISOString().split('T')[0] : null

      // Parse current status from item
      let currentStatuses: string[] = []
      if (selectedItemForCalendar.status) {
        try {
          const parsed = JSON.parse(selectedItemForCalendar.status)
          currentStatuses = Array.isArray(parsed) ? parsed : [parsed]
        } catch {
          currentStatuses = [selectedItemForCalendar.status]
        }
      }

      // Update status based on date assignment
      let newStatuses: string[] = []
      if (dateStr) {
        // Assigning date: set status to "Planned"
        newStatuses = currentStatuses.filter(s => s !== 'To plan')
        if (!newStatuses.includes('Planned')) {
          newStatuses.push('Planned')
        }
      } else {
        // Removing date: revert to "To plan"
        newStatuses = currentStatuses.filter(s => s !== 'Planned')
        if (!newStatuses.includes('To plan')) {
          newStatuses.push('To plan')
        }
      }

      const updateData: {
        planned_date: string | null
        itinerary_id?: string | null
        trip_position?: number | null
        status?: string | null
      } = {
        planned_date: dateStr,
        status: newStatuses.length > 0 ? JSON.stringify(newStatuses) : null,
      }

      if (selectedItineraryId) {
        updateData.itinerary_id = selectedItineraryId
        const { data: maxRow } = await supabase
          .from('saved_items')
          .select('trip_position')
          .eq('itinerary_id', selectedItineraryId)
          .order('trip_position', { ascending: false })
          .limit(1)
          .maybeSingle()
        updateData.trip_position = maxRow?.trip_position != null ? maxRow.trip_position + 1 : 0
      } else {
        updateData.itinerary_id = null
        updateData.trip_position = null
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
                planned_date: dateStr,
                itinerary_id: selectedItineraryId || null,
                trip_position: updateData.trip_position ?? null,
                status: updateData.status || null,
              }
            : item
        )
      )

      setShowCalendarModal(false)
      setSelectedItemForCalendar(null)
      setSelectedItineraryId(null)
      setSelectedDate(null)
    } catch (error) {
      console.error('Error saving calendar assignment:', error)
      alert('Failed to save calendar assignment. Please try again.')
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
            <span>Please confirm your email to get travel tips and updates. Check your inbox for the link.</span>
            <button
              onClick={() => setEmailVerified(true)}
              className="text-amber-700 hover:text-amber-900 text-sm underline"
              aria-label="Dismiss"
            >
              Dismiss
            </button>
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
                    onClick={() => toggleFilter('categories', category)}
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
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-medium text-secondary">Stage:</span>
                <button
                  onClick={() => setFilters(prev => ({ ...prev, statuses: [] }))}
                  className={`px-3 py-1.5 text-sm rounded-xl ${
                    filters.statuses.length === 0
                      ? 'bg-charcoal text-white'
                      : 'bg-gray-100 text-secondary hover:bg-gray-200'
                  }`}
                >
                  All
                </button>
                {[...sortedStatuses, ...sortedUserCustomStatuses].map((status) => (
                  <button
                    key={status}
                    onClick={() => toggleFilter('statuses', status)}
                    className={`px-3 py-1.5 text-sm rounded-xl ${
                      filters.statuses.includes(status)
                        ? 'bg-charcoal text-white'
                        : 'bg-gray-100 text-secondary hover:bg-gray-200'
                    }`}
                  >
                    {status}
                  </button>
                ))}
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 md:gap-8">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="bg-white rounded-2xl overflow-hidden shadow-soft animate-pulse">
                <div className="aspect-[4/3] bg-gray-200" />
                <div className="p-4">
                  <div className="h-4 bg-gray-200 rounded mb-2" />
                  <div className="h-3 bg-gray-200 rounded w-2/3" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Grid */}
        {!loading && filteredItems.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 md:gap-8">
            {filteredItems.map((item) => {
              const displayTitle = item.title || getHostname(item.url)
              const itemStatuses = parseItemField(item.status)
              const itemCategories = parseItemField(item.category)
              const oneCategory = itemCategories[0]
              const oneStatus = itemStatuses[0]

              const getStatusStyle = (status: string) => {
                const styles: Record<string, string> = {
                  'To plan': 'bg-gray-100 text-secondary',
                  'Planned': 'bg-blue-50 text-blue-700',
                  'Been': 'bg-green-50 text-green-700',
                  'Would love to go': 'bg-purple-50 text-purple-700',
                  'Maybe': 'bg-amber-50 text-amber-700',
                }
                return styles[status] || 'bg-gray-100 text-secondary'
              }

              return (
                <div
                  key={item.id}
                  className="bg-white rounded-2xl overflow-hidden shadow-soft hover:shadow-soft-md transition-shadow flex flex-col relative group"
                >
                  <Link href={`/item/${item.id}`} className="flex flex-col flex-1 min-h-0">
                    <div className="aspect-[4/3] bg-gray-50 relative overflow-hidden">
                      {item.screenshot_url ? (
                        <img
                          src={item.screenshot_url}
                          alt={displayTitle}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <EmbedPreview
                          url={item.url}
                          thumbnailUrl={item.thumbnail_url}
                          platform={item.platform}
                          displayTitle={displayTitle}
                        />
                      )}
                      <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded-md bg-white/80 text-secondary text-xs font-normal backdrop-blur-sm">
                        {item.platform}
                      </div>
                    </div>

                    <div className="p-4 flex-1 flex flex-col min-h-0">
                      <h3 className="font-medium text-charcoal mb-0.5 line-clamp-2 text-base leading-snug">
                        {displayTitle}
                      </h3>
                      {(item.location_city || item.location_country) && (
                        <p className="text-sm text-secondary mb-2">
                          {[item.location_city, item.location_country].filter(Boolean).join(', ')}
                        </p>
                      )}
                      {(oneCategory || oneStatus) && (
                        <div className="flex flex-wrap gap-1.5 mt-auto">
                          {oneCategory && (
                            <span className="px-2 py-0.5 rounded-lg text-xs font-normal bg-gray-100 text-secondary">
                              {oneCategory}
                            </span>
                          )}
                          {oneStatus && (
                            <span className={`px-2 py-0.5 rounded-lg text-xs font-normal ${getStatusStyle(oneStatus)}`}>
                              {oneStatus}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </Link>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      handleItemClick(e as unknown as React.MouseEvent, item)
                    }}
                    className="absolute top-2 right-2 z-10 p-2 rounded-xl bg-white/90 hover:bg-white shadow-soft text-secondary hover:text-charcoal transition-colors"
                    aria-label="Add to calendar"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </button>
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
                        onClick={() => toggleFilter('categories', category)}
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
                <h3 className="text-xs font-medium text-secondary mb-3">Stage</h3>
                <div className="overflow-x-auto pb-2 -mx-2 px-2">
                  <div className="flex gap-2 min-w-max">
                    <button
                      onClick={() => setFilters(prev => ({ ...prev, statuses: [] }))}
                      className={`px-3 py-1.5 rounded-xl text-sm font-medium whitespace-nowrap ${
                        filters.statuses.length === 0
                          ? 'bg-charcoal text-white'
                          : 'bg-gray-100 text-secondary hover:bg-gray-200'
                      }`}
                    >
                      All
                    </button>
                    {[...sortedStatuses, ...sortedUserCustomStatuses].map((status) => (
                      <button
                        key={status}
                        onClick={() => toggleFilter('statuses', status)}
                        className={`px-3 py-1.5 rounded-xl text-sm font-medium whitespace-nowrap ${
                          filters.statuses.includes(status)
                            ? 'bg-charcoal text-white'
                            : 'bg-gray-100 text-secondary hover:bg-gray-200'
                        }`}
                      >
                        {status}
                      </button>
                    ))}
                  </div>
                </div>
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

      {/* Calendar Assignment Modal */}
      {showCalendarModal && selectedItemForCalendar && (
        <CalendarAssignmentModal
          item={selectedItemForCalendar}
          itineraries={itineraries}
          itemsForContext={items}
          selectedItineraryId={selectedItineraryId}
          onItineraryChange={setSelectedItineraryId}
          selectedDate={selectedDate}
          onDateChange={setSelectedDate}
          viewMonth={viewMonth}
          onViewMonthChange={setViewMonth}
          onSave={handleSaveCalendar}
          onClose={() => {
            setShowCalendarModal(false)
            setSelectedItemForCalendar(null)
            setSelectedItineraryId(null)
            setSelectedDate(null)
          }}
          saving={savingCalendar}
        />
      )}
    </div>
  )
}

// Calendar Assignment Modal Component
interface CalendarAssignmentModalProps {
  item: SavedItem
  itineraries: Itinerary[]
  itemsForContext?: SavedItem[]
  selectedItineraryId: string | null
  onItineraryChange: (id: string | null) => void
  selectedDate: Date | null
  onDateChange: (date: Date | null) => void
  viewMonth: Date
  onViewMonthChange: (date: Date) => void
  onSave: () => void
  onClose: () => void
  saving: boolean
}

function CalendarAssignmentModal({
  item,
  itineraries,
  itemsForContext = [],
  selectedItineraryId,
  onItineraryChange,
  selectedDate,
  onDateChange,
  viewMonth,
  onViewMonthChange,
  onSave,
  onClose,
  saving,
}: CalendarAssignmentModalProps) {
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

  // Generate calendar days for view month
  const calendarDays = useMemo(() => {
    const year = viewMonth.getFullYear()
    const month = viewMonth.getMonth()
    const firstDay = new Date(year, month, 1)
    const startDate = new Date(firstDay)
    startDate.setDate(startDate.getDate() - startDate.getDay()) // Start from Sunday

    const days: Date[] = []
    for (let i = 0; i < 42; i++) {
      const date = new Date(startDate)
      date.setDate(startDate.getDate() + i)
      days.push(date)
    }
    return days
  }, [viewMonth])

  // Count existing items per day (excluding current item) for calendar context
  const itemsByDateStr = useMemo(() => {
    const relevant = itemsForContext.filter(
      (i) => i.id !== item.id && i.planned_date && (!selectedItineraryId || i.itinerary_id === selectedItineraryId)
    )
    const map: Record<string, number> = {}
    relevant.forEach((i) => {
      const d = i.planned_date!
      map[d] = (map[d] || 0) + 1
    })
    return map
  }, [itemsForContext, item.id, selectedItineraryId])

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ]

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  const isSameDay = (date1: Date, date2: Date | null) => {
    if (!date2) return false
    return (
      date1.getDate() === date2.getDate() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getFullYear() === date2.getFullYear()
    )
  }

  const handleDateClick = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0]
    const currentDateStr = selectedDate ? selectedDate.toISOString().split('T')[0] : null

    // Toggle date if clicking the same date
    if (dateStr === currentDateStr) {
      onDateChange(null)
    } else {
      onDateChange(date)
    }
  }

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
  const modalStatuses = parseField(item.status)
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
  const getStatusStyle = (status: string) => {
    const styles: Record<string, string> = {
      'To plan': 'bg-gray-100 text-gray-700',
      'Planned': 'bg-blue-100 text-blue-700',
      'Been': 'bg-green-100 text-green-700',
      'Would love to go': 'bg-purple-100 text-purple-700',
      'Maybe': 'bg-yellow-100 text-yellow-700',
    }
    return styles[status] || 'bg-gray-100 text-gray-700'
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
            <h2 className="text-lg font-semibold text-gray-900">Add to Calendar</h2>
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
              {(modalCategories.length > 0 || modalStatuses.length > 0) && (
                <div className="flex flex-wrap gap-1.5">
                  {modalCategories.map((cat, idx) => (
                    <span key={`c-${idx}`} className="px-2 py-0.5 rounded bg-gray-100 text-gray-600 text-xs">
                      {cat}
                    </span>
                  ))}
                  {modalStatuses.map((status, idx) => (
                    <span key={`s-${idx}`} className={`px-2 py-0.5 rounded text-xs font-medium ${getStatusStyle(status)}`}>
                      {status}
                    </span>
                  ))}
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
              Trip (optional)
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

          {/* Date Picker */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Date (optional)
            </label>
            {/* Month Navigation */}
            <div className="mb-4 flex items-center justify-between">
              <button
                onClick={() => {
                  const newDate = new Date(viewMonth)
                  newDate.setMonth(viewMonth.getMonth() - 1)
                  onViewMonthChange(newDate)
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <h3 className="text-lg font-semibold text-gray-900">
                {monthNames[viewMonth.getMonth()]} {viewMonth.getFullYear()}
              </h3>
              <button
                onClick={() => {
                  const newDate = new Date(viewMonth)
                  newDate.setMonth(viewMonth.getMonth() + 1)
                  onViewMonthChange(newDate)
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>

            {/* Week day headers */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {weekDays.map((day) => (
                <div key={day} className="p-2 text-center text-xs font-medium text-gray-700">
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar days */}
            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map((day, index) => {
                const isCurrentMonth = day.getMonth() === viewMonth.getMonth()
                const isSelected = isSameDay(day, selectedDate)
                const today = new Date()
                const isToday = isSameDay(day, today)
                const dateStr = day.toISOString().split('T')[0]
                const existingCount = itemsByDateStr[dateStr] || 0

                return (
                  <button
                    key={index}
                    onClick={() => handleDateClick(day)}
                    className={`p-2 text-sm rounded-lg transition-colors flex flex-col items-center min-h-[2.5rem] ${
                      !isCurrentMonth
                        ? 'text-gray-300'
                        : isSelected
                        ? 'bg-gray-900 text-white font-medium'
                        : isToday
                        ? 'bg-blue-50 text-blue-600 font-medium'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    {day.getDate()}
                    {isCurrentMonth && existingCount > 0 && (
                      <span className={`mt-0.5 w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white/80' : 'bg-gray-400'}`} title={`${existingCount} planned`} />
                    )}
                  </button>
                )
              })}
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
            You can also set trip on the{' '}
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
