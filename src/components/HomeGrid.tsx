'use client'

import { useEffect, useState, useMemo, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { SavedItem, CATEGORIES, STATUSES, Itinerary } from '@/types/database'
import { getHostname } from '@/lib/utils'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
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
  const [showFilterModal, setShowFilterModal] = useState(false)
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

  useEffect(() => {
    if (user) {
      loadItems()
      loadUserCustomOptions()
      loadItineraries()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

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

  // Handle item click - show calendar assignment modal
  const handleItemClick = (e: React.MouseEvent, item: SavedItem) => {
    e.preventDefault()
    setSelectedItemForCalendar(item)
    setSelectedItineraryId(item.itinerary_id || null)
    setSelectedDate(item.planned_date ? new Date(item.planned_date) : null)
    setViewMonth(item.planned_date ? new Date(item.planned_date) : new Date())
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
        status?: string | null
      } = {
        planned_date: dateStr,
        status: newStatuses.length > 0 ? JSON.stringify(newStatuses) : null,
      }

      // If an itinerary is selected and we're assigning a date, also assign to itinerary
      if (selectedItineraryId && dateStr) {
        updateData.itinerary_id = selectedItineraryId
      } else if (!dateStr) {
        // If removing date, also remove itinerary assignment
        updateData.itinerary_id = null
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
      <header className="md:hidden bg-white border-b border-gray-200 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold text-gray-900">FiBi</h1>
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
                className="bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-800"
              >
                Add
              </Link>
              <MobileMenu isAuthenticated={!!user} onSignOut={handleSignOut} />
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8 pb-24 md:pb-8">
        {showConfirmedMessage && (
          <div className="mb-6 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg flex items-center justify-between">
            <span>✓ Email confirmed! You&apos;re all set.</span>
            <button
              onClick={() => setShowConfirmedMessage(false)}
              className="text-green-700 hover:text-green-900 ml-4"
            >
              ✕
            </button>
          </div>
        )}

        {/* Filters - Desktop: horizontal chips, Mobile: modal */}
        {items.length > 0 && (
          <div className="mb-6 md:mb-8 hidden md:block">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-medium text-gray-700">Category:</span>
                <button
                  onClick={() => setFilters(prev => ({ ...prev, categories: [] }))}
                  className={`px-3 py-1 text-sm rounded-md ${
                    filters.categories.length === 0
                      ? 'bg-gray-900 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  All
                </button>
                {[...sortedCategories, ...sortedUserCustomCategories].map((category) => (
                  <button
                    key={category}
                    onClick={() => toggleFilter('categories', category)}
                    className={`px-3 py-1 text-sm rounded-md ${
                      filters.categories.includes(category)
                        ? 'bg-gray-900 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {category}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-medium text-gray-700">Stage:</span>
                <button
                  onClick={() => setFilters(prev => ({ ...prev, statuses: [] }))}
                  className={`px-3 py-1 text-sm rounded-md ${
                    filters.statuses.length === 0
                      ? 'bg-gray-900 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  All
                </button>
                {[...sortedStatuses, ...sortedUserCustomStatuses].map((status) => (
                  <button
                    key={status}
                    onClick={() => toggleFilter('statuses', status)}
                    className={`px-3 py-1 text-sm rounded-md ${
                      filters.statuses.includes(status)
                        ? 'bg-gray-900 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {status}
                  </button>
                ))}
              </div>
              {activeFiltersCount > 0 && (
                <button
                  onClick={clearFilters}
                  className="text-sm text-gray-500 hover:text-gray-700"
                >
                  Clear all
                </button>
              )}
            </div>
          </div>
        )}

        {/* Empty state */}
        {!loading && filteredItems.length === 0 && (
          <div className="max-w-3xl mx-auto">
            {items.length > 0 && activeFiltersCount > 0 ? (
              <div className="text-center py-12 md:py-16">
                <h2 className="text-xl md:text-2xl font-semibold text-gray-900 mb-2">
                  No places match your filters
                </h2>
                <p className="text-sm md:text-base text-gray-600 mb-6">
                  Try adjusting your filters to see more results.
                </p>
                <button
                  onClick={clearFilters}
                  className="inline-block bg-gray-900 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-gray-800"
                >
                  Clear all filters
                </button>
              </div>
            ) : (
              <div className="text-center py-12 md:py-16">
                <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3">
                  Save places you don&apos;t want to forget
                </h2>
                <p className="text-base md:text-lg text-gray-600 mb-8">
                  From TikTok, Instagram, and the web — all in one calm place.
                </p>
                <Link
                  href="/app/add"
                  className="inline-block bg-gray-900 text-white px-8 py-3 rounded-lg font-medium hover:bg-gray-800 mb-2"
                >
                  Add your first place
                </Link>
                <p className="text-sm text-gray-500">
                  Or share a link from another app
                </p>
              </div>
            )}
          </div>
        )}

        {/* Loading state */}
        {loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="bg-white rounded-2xl overflow-hidden shadow-sm animate-pulse">
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
            {filteredItems.map((item) => {
              const displayTitle = item.title || getHostname(item.url)
              const itemStatuses = parseItemField(item.status)
              
              const getPlatformStyle = (platform: string) => {
                const styles: Record<string, string> = {
                  'TikTok': 'bg-black text-white',
                  'Instagram': 'bg-gradient-to-r from-purple-500 to-pink-500 text-white',
                  'YouTube': 'bg-red-600 text-white',
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
                  key={item.id}
                  onClick={(e) => handleItemClick(e, item)}
                  className="bg-white rounded-xl md:rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow flex flex-col cursor-pointer"
                >
                  <div className="aspect-[4/3] bg-gray-50 relative overflow-hidden">
                    {item.screenshot_url ? (
                      <>
                        <img
                          src={item.screenshot_url}
                          alt={displayTitle}
                          className="w-full h-full object-cover"
                          loading="lazy"
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
                    <div className={`absolute bottom-2 left-2 md:top-2 md:right-2 md:bottom-auto md:left-auto px-2 py-1 rounded text-xs font-medium ${getPlatformStyle(item.platform)}`}>
                      {item.platform}
                    </div>
                  </div>

                  <div className="p-3 md:p-4 flex-1 flex flex-col">
                    <h3 className="font-medium text-gray-900 mb-1 line-clamp-2 text-sm md:text-base">
                      {displayTitle}
                    </h3>
                    {(item.location_city || item.location_country) && (
                      <p className="text-xs md:text-sm text-gray-600 mb-2">
                        {[item.location_city, item.location_country].filter(Boolean).join(', ')}
                      </p>
                    )}
                    {itemStatuses.length > 0 && (
                      <div className="mt-auto pt-2 flex flex-wrap gap-1.5">
                        {itemStatuses.map((status, idx) => (
                          <span key={idx} className={`px-2.5 py-1 rounded-full text-xs font-medium ${getStatusStyle(status)}`}>
                            {status}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>

      {/* Floating Add Button - Mobile only */}
      <Link
        href="/app/add"
        className="fixed bottom-6 right-6 md:hidden z-30 bg-gray-900 text-white w-14 h-14 rounded-full shadow-lg hover:bg-gray-800 transition-colors flex items-center justify-center"
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
            className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl shadow-xl max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white border-b border-gray-200 px-4 py-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Filter</h2>
              <button
                onClick={() => setShowFilterModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="p-4 space-y-6">
              <div>
                <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">Category</h3>
                <div className="overflow-x-auto pb-2 -mx-2 px-2">
                  <div className="flex gap-2 min-w-max">
                    <button
                      onClick={() => setFilters(prev => ({ ...prev, categories: [] }))}
                      className={`px-3 py-1.5 rounded-md text-sm font-medium whitespace-nowrap ${
                        filters.categories.length === 0
                          ? 'bg-gray-900 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      All
                    </button>
                    {[...sortedCategories, ...sortedUserCustomCategories].map((category) => (
                      <button
                        key={category}
                        onClick={() => toggleFilter('categories', category)}
                        className={`px-3 py-1.5 rounded-md text-sm font-medium whitespace-nowrap ${
                          filters.categories.includes(category)
                            ? 'bg-gray-900 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {category}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">Stage</h3>
                <div className="overflow-x-auto pb-2 -mx-2 px-2">
                  <div className="flex gap-2 min-w-max">
                    <button
                      onClick={() => setFilters(prev => ({ ...prev, statuses: [] }))}
                      className={`px-3 py-1.5 rounded-md text-sm font-medium whitespace-nowrap ${
                        filters.statuses.length === 0
                          ? 'bg-gray-900 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      All
                    </button>
                    {[...sortedStatuses, ...sortedUserCustomStatuses].map((status) => (
                      <button
                        key={status}
                        onClick={() => toggleFilter('statuses', status)}
                        className={`px-3 py-1.5 rounded-md text-sm font-medium whitespace-nowrap ${
                          filters.statuses.includes(status)
                            ? 'bg-gray-900 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {status}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-200 space-y-2">
                {activeFiltersCount > 0 && (
                  <button
                    onClick={clearFilters}
                    className="w-full px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Clear filters
                  </button>
                )}
                <button
                  onClick={() => setShowFilterModal(false)}
                  className="w-full bg-gray-900 text-white py-3 rounded-lg font-medium hover:bg-gray-800"
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
      console.error('Error creating itinerary:', error)
      alert('Failed to create itinerary. Please try again.')
    } finally {
      setCreatingItinerary(false)
    }
  }

  const displayTitle = item.title || getHostname(item.url)

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
            <p className="text-sm text-gray-600 mt-1 line-clamp-1">{displayTitle}</p>
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
          {/* Itinerary Selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Itinerary (optional)
            </label>
            <div className="space-y-2">
              <select
                value={selectedItineraryId || ''}
                onChange={(e) => onItineraryChange(e.target.value || null)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:ring-2 focus:ring-gray-900 focus:border-gray-900 bg-white"
              >
                <option value="">No itinerary</option>
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
                  + Create new itinerary
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
                    placeholder="Itinerary name"
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

                return (
                  <button
                    key={index}
                    onClick={() => handleDateClick(day)}
                    className={`p-2 text-sm rounded-lg transition-colors ${
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
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="border-t border-gray-200 p-5 bg-gray-50">
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
        </div>
      </div>
    </div>
  )
}
