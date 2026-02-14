'use client'

import { useEffect, useState, useMemo } from 'react'
import { SavedItem, STATUSES } from '@/types/database'
import { getHostname } from '@/lib/utils'
import Link from 'next/link'
import LinkPreview from '@/components/LinkPreview'
import CollapsibleOptions from '@/components/CollapsibleOptions'
import { createClient } from '@/lib/supabase/client'

interface SharedItineraryViewProps {
  shareToken: string
}

interface SharedItineraryData {
  itinerary: {
    id: string
    name: string
    created_at: string
  }
  items: SavedItem[]
  share_type?: 'copy' | 'collaborate'
}

interface CalendarDay {
  date: Date
  items: SavedItem[]
  isCurrentMonth: boolean
  isToday: boolean
}

export default function SharedItineraryView({ shareToken }: SharedItineraryViewProps) {
  const [data, setData] = useState<SharedItineraryData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [viewMode, setViewMode] = useState<'calendar' | 'map' | 'list'>('calendar')
  const [selectedItem, setSelectedItem] = useState<SavedItem | null>(null)
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([])
  const [user, setUser] = useState<{ id: string } | null>(null)
  const [addingToAccount, setAddingToAccount] = useState(false)
  const [addToAccountError, setAddToAccountError] = useState<string | null>(null)
  const [addToAccountSuccess, setAddToAccountSuccess] = useState<{ itinerary_id: string; name: string } | null>(null)
  const [joiningCollaborator, setJoiningCollaborator] = useState(false)
  const [joinCollaboratorError, setJoinCollaboratorError] = useState<string | null>(null)
  const supabase = createClient()

  const isCollaborateShare = data?.share_type === 'collaborate'

  useEffect(() => {
    loadSharedItinerary()
  }, [shareToken])

  useEffect(() => {
    const loadUser = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setUser(session?.user ?? null)
    }
    loadUser()
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })
    return () => subscription.unsubscribe()
  }, [])

  const loadSharedItinerary = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/itinerary/share/${shareToken}`)
      
      if (!response.ok) {
        if (response.status === 404) {
          setError('This itinerary is no longer available or the link has been revoked.')
        } else {
          setError('Failed to load itinerary. Please try again later.')
        }
        return
      }

      const result = await response.json()
      setData(result)
    } catch (err) {
      console.error('Error loading shared itinerary:', err)
      setError('Failed to load itinerary. Please try again later.')
    } finally {
      setLoading(false)
    }
  }

  const handleAddToAccount = async () => {
    if (!user) return
    setAddingToAccount(true)
    setAddToAccountError(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const headers: HeadersInit = { 'Content-Type': 'application/json' }
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`
      }
      const response = await fetch(`/api/itinerary/share/${shareToken}/add-to-account`, {
        method: 'POST',
        credentials: 'include',
        headers,
      })
      const result = await response.json()
      if (response.status === 401) {
        window.location.href = `/login?redirect=${encodeURIComponent(`/share/itinerary/${shareToken}`)}`
        return
      }
      if (!response.ok) {
        setAddToAccountError(result.error || 'Failed to add to your account.')
        return
      }
      setAddToAccountSuccess({ itinerary_id: result.itinerary_id, name: result.name })
    } catch (err) {
      console.error('Error adding to account:', err)
      setAddToAccountError('Failed to add to your account. Please try again.')
    } finally {
      setAddingToAccount(false)
    }
  }

  const handleJoinCollaborator = async () => {
    if (!user) return
    setJoiningCollaborator(true)
    setJoinCollaboratorError(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const headers: HeadersInit = { 'Content-Type': 'application/json' }
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`
      }
      const response = await fetch(`/api/itinerary/share/${shareToken}/join-collaborator`, {
        method: 'POST',
        credentials: 'include',
        headers,
      })
      const result = await response.json()
      if (response.status === 401) {
        window.location.href = `/login?redirect=${encodeURIComponent(`/share/itinerary/${shareToken}`)}`
        return
      }
      if (!response.ok) {
        setJoinCollaboratorError(result.error || 'Failed to join as collaborator.')
        return
      }
      if (result.redirect_url) {
        window.location.href = result.redirect_url
        return
      }
    } catch (err) {
      console.error('Error joining as collaborator:', err)
      setJoinCollaboratorError('Failed to join. Please try again.')
    } finally {
      setJoiningCollaborator(false)
    }
  }

  // Helper function to parse statuses from item (supports both single string and array)
  const parseItemStatuses = (item: SavedItem): string[] => {
    if (!item.status) return []
    // If it's already an array, return it
    if (Array.isArray(item.status)) return item.status
    // If it's a JSON string, parse it
    try {
      const parsed = JSON.parse(item.status)
      if (Array.isArray(parsed)) return parsed
    } catch {
      // Not JSON, treat as single value
    }
    // Single value
    return [item.status]
  }

  // Calculate status counts for filtering
  const statusCounts = useMemo(() => {
    if (!data) return {}
    const counts: Record<string, number> = {}
    data.items.forEach((item) => {
      const itemStatuses = parseItemStatuses(item)
      itemStatuses.forEach((stat) => {
        counts[stat] = (counts[stat] || 0) + 1
      })
    })
    return counts
  }, [data])

  // Sort statuses by popularity (most used first), then by name
  const sortedStatuses = useMemo(() => {
    return [...STATUSES].sort((a, b) => {
      const countA = statusCounts[a] || 0
      const countB = statusCounts[b] || 0
      if (countA !== countB) return countB - countA
      return a.localeCompare(b)
    })
  }, [statusCounts])

  // Filter items based on selected statuses
  const filteredItems = useMemo(() => {
    if (!data) return []
    
    // If no status filters selected, show all
    if (selectedStatuses.length === 0) return data.items
    
    // Filter items that have at least one of the selected statuses
    return data.items.filter((item) => {
      const itemStatuses = parseItemStatuses(item)
      return selectedStatuses.some(status => itemStatuses.includes(status))
    })
  }, [data, selectedStatuses])

  // Generate calendar days for current month
  const calendarDays = useMemo(() => {
    if (!data) return []

    const year = currentMonth.getFullYear()
    const month = currentMonth.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const startDate = new Date(firstDay)
    startDate.setDate(startDate.getDate() - startDate.getDay()) // Start from Sunday

    const days: CalendarDay[] = []
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    for (let i = 0; i < 42; i++) {
      const date = new Date(startDate)
      date.setDate(startDate.getDate() + i)
      const dateStr = date.toISOString().split('T')[0]
      const dateObj = new Date(date)
      dateObj.setHours(0, 0, 0, 0)

      const dayItems = filteredItems.filter((item) => {
        if (!item.planned_date) return false
        const plannedDate = new Date(item.planned_date)
        plannedDate.setHours(0, 0, 0, 0)
        return plannedDate.getTime() === dateObj.getTime()
      })

      days.push({
        date: dateObj,
        items: dayItems,
        isCurrentMonth: date.getMonth() === month,
        isToday: dateObj.getTime() === today.getTime(),
      })
    }

    return days
  }, [currentMonth, filteredItems, data])

  // Get unplanned items
  const unplannedItems = useMemo(() => {
    return filteredItems.filter((item) => !item.planned_date)
  }, [filteredItems])

  const monthNames = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ]

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentMonth((prev) => {
      const newDate = new Date(prev)
      if (direction === 'prev') {
        newDate.setMonth(prev.getMonth() - 1)
      } else {
        newDate.setMonth(prev.getMonth() + 1)
      }
      return newDate
    })
  }

  const goToToday = () => {
    setCurrentMonth(new Date())
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading itinerary...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="mb-4">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Unable to load itinerary</h2>
          <p className="text-sm text-gray-600 mb-6">{error}</p>
          <Link
            href="/"
            className="inline-block bg-gray-900 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors"
          >
            Go to FiBi
          </Link>
        </div>
      </div>
    )
  }

  if (!data) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-gray-900">{data.itinerary.name}</h1>
              <p className="text-xs text-gray-500 mt-1">Shared itinerary</p>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              {addToAccountSuccess ? (
                <Link
                  href={`/app/calendar?itinerary_id=${encodeURIComponent(addToAccountSuccess.itinerary_id)}`}
                  className="inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium bg-green-600 text-white hover:bg-green-700 transition-colors"
                >
                  View in my account
                </Link>
              ) : isCollaborateShare ? (
                <>
                  {user ? (
                    <button
                      type="button"
                      onClick={handleJoinCollaborator}
                      disabled={joiningCollaborator}
                      className="inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium bg-gray-900 text-white hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {joiningCollaborator ? (
                        <>
                          <svg className="animate-spin h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                          Joining…
                        </>
                      ) : (
                        'Join as collaborator'
                      )}
                    </button>
                  ) : (
                    <Link
                      href={`/login?redirect=${encodeURIComponent(`/share/itinerary/${shareToken}`)}`}
                      className="inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium bg-gray-900 text-white hover:bg-gray-800 transition-colors"
                    >
                      Join as collaborator
                    </Link>
                  )}
                  {user && (
                    <button
                      type="button"
                      onClick={handleAddToAccount}
                      disabled={addingToAccount}
                      className="inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {addingToAccount ? 'Adding…' : 'Add a copy to my account'}
                    </button>
                  )}
                </>
              ) : user ? (
                <button
                  type="button"
                  onClick={handleAddToAccount}
                  disabled={addingToAccount}
                  className="inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium bg-gray-900 text-white hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {addingToAccount ? (
                    <>
                      <svg className="animate-spin h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Adding…
                    </>
                  ) : (
                    'Add to my account'
                  )}
                </button>
              ) : (
                <Link
                  href={`/login?redirect=${encodeURIComponent(`/share/itinerary/${shareToken}`)}`}
                  className="inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium bg-gray-900 text-white hover:bg-gray-800 transition-colors"
                >
                  Add to my account
                </Link>
              )}
              <Link
                href="/"
                className="text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
              >
                FiBi
              </Link>
            </div>
          </div>
          {addToAccountError && (
            <p className="text-sm text-red-600 mt-2">{addToAccountError}</p>
          )}
          {joinCollaboratorError && (
            <p className="text-sm text-red-600 mt-2">{joinCollaboratorError}</p>
          )}
          {addToAccountSuccess && (
            <p className="text-sm text-green-600 mt-2">Added &quot;{addToAccountSuccess.name}&quot; to your account.</p>
          )}
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8">
        {/* View Mode Tabs */}
        <div className="mb-6">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode('calendar')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                viewMode === 'calendar'
                  ? 'bg-gray-900 text-white'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              Calendar
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                viewMode === 'list'
                  ? 'bg-gray-900 text-white'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              List
            </button>
            <button
              onClick={() => setViewMode('map')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                viewMode === 'map'
                  ? 'bg-gray-900 text-white'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              Map
            </button>
          </div>
        </div>

        {/* Status Filters */}
        {data && data.items.length > 0 && (
          <div className="mb-6 bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex flex-wrap gap-2 items-center">
              <span className="text-sm font-medium text-gray-700 mr-2">Stage:</span>
              <CollapsibleOptions>
                <button
                  onClick={() => setSelectedStatuses([])}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                    selectedStatuses.length === 0
                      ? 'bg-gray-900 text-white'
                      : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  All
                </button>
                {sortedStatuses.map((status) => {
                  const isSelected = selectedStatuses.includes(status)
                  const count = statusCounts[status] || 0
                  if (count === 0) return null // Don't show statuses with no items
                  return (
                    <button
                      key={status}
                      onClick={() => {
                        if (isSelected) {
                          setSelectedStatuses(selectedStatuses.filter(s => s !== status))
                        } else {
                          setSelectedStatuses([...selectedStatuses, status])
                        }
                      }}
                      className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                        isSelected
                          ? 'bg-gray-900 text-white'
                          : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {status} ({count})
                    </button>
                  )
                })}
              </CollapsibleOptions>
            </div>
            {selectedStatuses.length > 0 && (
              <div className="mt-3">
                <button
                  onClick={() => setSelectedStatuses([])}
                  className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Clear filters
                </button>
              </div>
            )}
          </div>
        )}

        {/* Calendar View */}
        {viewMode === 'calendar' && (
          <>
            {/* Month Navigation */}
            <div className="mb-6 flex items-center justify-between">
              <button
                onClick={() => navigateMonth('prev')}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                aria-label="Previous month"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
              </button>

              <div className="flex items-center gap-4">
                <h2 className="text-xl md:text-2xl font-semibold text-gray-900">
                  {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
                </h2>
                <button
                  onClick={goToToday}
                  className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Today
                </button>
              </div>

              <button
                onClick={() => navigateMonth('next')}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                aria-label="Next month"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </button>
            </div>

            {/* Unplanned Items Section */}
            {unplannedItems.length > 0 && (
              <div className="mb-6">
                <h3 className="text-sm font-medium text-gray-700 mb-3">
                  Unplanned ({unplannedItems.length})
                </h3>
                <div className="min-h-[100px] p-4 bg-white rounded-xl border-2 border-dashed border-gray-300 flex flex-wrap gap-3">
                  {unplannedItems.map((item) => (
                    <PlaceCard
                      key={item.id}
                      item={item}
                      onSelect={() => setSelectedItem(item)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Calendar Grid */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              {/* Week day headers */}
              <div className="grid grid-cols-7 border-b border-gray-200">
                {weekDays.map((day) => (
                  <div
                    key={day}
                    className="p-2 md:p-3 text-center text-xs md:text-sm font-medium text-gray-700 bg-gray-50"
                  >
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendar days */}
              <div className="grid grid-cols-7">
                {calendarDays.map((day, index) => (
                  <div
                    key={index}
                    className={`min-h-[80px] md:min-h-[120px] p-1 md:p-2 border-r border-b border-gray-200 ${
                      day.isCurrentMonth ? 'bg-white' : 'bg-gray-50'
                    } ${day.isToday ? 'bg-blue-50' : ''}`}
                  >
                    <div
                      className={`text-xs md:text-sm font-medium mb-1 ${
                        day.isCurrentMonth ? 'text-gray-900' : 'text-gray-400'
                      } ${day.isToday ? 'text-blue-600 font-bold' : ''}`}
                    >
                      {day.date.getDate()}
                    </div>
                    <div className="space-y-1">
                      {day.items.map((item) => (
                        <PlaceCard
                          key={item.id}
                          item={item}
                          compact
                          onSelect={() => setSelectedItem(item)}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* List View */}
        {viewMode === 'list' && (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="p-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                {filteredItems.length} {filteredItems.length === 1 ? 'place' : 'places'}
              </h2>
            </div>
            <div className="divide-y divide-gray-200">
              {filteredItems.map((item) => (
                <div
                  key={item.id}
                  onClick={() => setSelectedItem(item)}
                  className="p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  <div className="flex gap-4">
                    <div className="w-24 h-24 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                      {item.screenshot_url ? (
                        <img
                          src={item.screenshot_url}
                          alt={item.title || getHostname(item.url)}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <LinkPreview
                          url={item.url}
                          ogImage={item.thumbnail_url}
                          screenshotUrl={item.screenshot_url}
                          description={item.description}
                        />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-base font-medium text-gray-900 mb-1">
                        {item.title || getHostname(item.url)}
                      </h3>
                      {item.description && (
                        <p className="text-sm text-gray-600 line-clamp-2 mb-2">
                          {item.description}
                        </p>
                      )}
                      {(item.place_name || item.formatted_address) && (
                        <p className="text-xs text-gray-500">
                          {item.place_name || item.formatted_address}
                        </p>
                      )}
                      {item.planned_date && (
                        <p className="text-xs text-gray-500 mt-1">
                          {new Date(item.planned_date).toLocaleDateString('en-US', {
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric',
                          })}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Map View */}
        {viewMode === 'map' && (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="aspect-video w-full bg-gray-100 flex items-center justify-center">
              <div className="text-center">
                <svg
                  className="mx-auto h-12 w-12 text-gray-400 mb-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
                  />
                </svg>
                <p className="text-sm text-gray-600">
                  Map view coming soon
                </p>
              </div>
            </div>
          </div>
        )}

        {/* CTA Section */}
        <div className="mt-8 bg-white rounded-xl border border-gray-200 p-6 text-center">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Save a copy to your FiBi
          </h3>
          <p className="text-sm text-gray-600 mb-4">
            Create your own travel plans and keep track of places you want to visit.
          </p>
          <Link
            href="/login"
            className="inline-block bg-gray-900 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors"
          >
            Get started
          </Link>
        </div>
      </main>

      {/* Place Preview Modal */}
      {selectedItem && (
        <PlacePreviewModal
          item={selectedItem}
          onClose={() => setSelectedItem(null)}
        />
      )}
    </div>
  )
}

// Place Card Component
interface PlaceCardProps {
  item: SavedItem
  compact?: boolean
  onSelect?: () => void
}

function PlaceCard({ item, compact = false, onSelect }: PlaceCardProps) {
  const displayTitle = item.title || getHostname(item.url)

  if (compact) {
    return (
      <div
        onClick={onSelect}
        className="bg-white rounded border border-gray-200 p-1.5 cursor-pointer hover:shadow-sm transition-shadow"
      >
        <div className="aspect-video rounded mb-1 overflow-hidden bg-gray-100">
          {item.screenshot_url ? (
            <img
              src={item.screenshot_url}
              alt={displayTitle}
              className="w-full h-full object-cover"
            />
          ) : (
            <LinkPreview
              url={item.url}
              ogImage={item.thumbnail_url}
              screenshotUrl={item.screenshot_url}
              description={item.description}
            />
          )}
        </div>
        <p className="text-xs font-medium text-gray-900 line-clamp-1">{displayTitle}</p>
      </div>
    )
  }

  return (
    <div
      onClick={onSelect}
      className="bg-white rounded-lg border border-gray-200 p-2 w-32 md:w-40 cursor-pointer hover:shadow-md transition-shadow"
    >
      <div className="aspect-video rounded mb-2 overflow-hidden bg-gray-100">
        {item.screenshot_url ? (
          <img
            src={item.screenshot_url}
            alt={displayTitle}
            className="w-full h-full object-cover"
          />
        ) : (
          <LinkPreview
            url={item.url}
            ogImage={item.thumbnail_url}
            screenshotUrl={item.screenshot_url}
            description={item.description}
          />
        )}
      </div>
      <p className="text-xs md:text-sm font-medium text-gray-900 line-clamp-2">
        {displayTitle}
      </p>
    </div>
  )
}

// Place Preview Modal Component
interface PlacePreviewModalProps {
  item: SavedItem
  onClose: () => void
}

function PlacePreviewModal({ item, onClose }: PlacePreviewModalProps) {
  const displayTitle = item.title || getHostname(item.url)
  const imageUrl = item.screenshot_url || item.thumbnail_url

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose()
        }
      }}
    >
      <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-hidden shadow-xl flex flex-col">
        {/* Image Header */}
        <div className="relative">
          {imageUrl ? (
            <div className="aspect-video w-full overflow-hidden bg-gray-100">
              <img
                src={imageUrl}
                alt={displayTitle}
                className="w-full h-full object-cover"
              />
            </div>
          ) : (
            <div className="aspect-video w-full bg-gray-100 relative overflow-hidden">
              <LinkPreview
                url={item.url}
                ogImage={item.thumbnail_url}
                screenshotUrl={item.screenshot_url}
                description={item.description}
              />
            </div>
          )}
          <button
            onClick={onClose}
            className="absolute top-3 right-3 p-2 bg-black/70 hover:bg-black/90 text-white rounded-full transition-colors backdrop-blur-sm"
            aria-label="Close"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-5 space-y-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-1">{displayTitle}</h2>
              {item.description && (
                <p className="text-sm text-gray-600 leading-relaxed">{item.description}</p>
              )}
            </div>

            {(item.place_name || item.formatted_address || item.location_city) && (
              <div className="flex items-start gap-2">
                <svg
                  className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-0.5">
                    Location
                  </p>
                  <p className="text-sm text-gray-900">
                    {item.place_name ||
                      item.formatted_address ||
                      (item.location_city && item.location_country
                        ? `${item.location_city}, ${item.location_country}`
                        : item.location_city || item.location_country || '')}
                  </p>
                </div>
              </div>
            )}

            {item.planned_date && (
              <div className="flex items-start gap-2">
                <svg
                  className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-0.5">
                    Planned Date
                  </p>
                  <p className="text-sm text-gray-900">
                    {new Date(item.planned_date).toLocaleDateString('en-US', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="border-t border-gray-200 p-5 bg-gray-50">
          {item.url && (
            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full block bg-gray-900 text-white py-3 px-4 rounded-lg font-medium hover:bg-gray-800 transition-colors text-center"
            >
              Open Link
            </a>
          )}
        </div>
      </div>
    </div>
  )
}

