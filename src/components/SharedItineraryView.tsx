'use client'

import { useEffect, useState, useMemo } from 'react'
import { SavedItem } from '@/types/database'
import { getHostname, isMobileDevice } from '@/lib/utils'
import Link from 'next/link'
import LinkPreview from '@/components/LinkPreview'
import PlaceDetailDrawer from '@/components/PlaceDetailDrawer'
import CollapsibleOptions from '@/components/CollapsibleOptions'
import { createClient } from '@/lib/supabase/client'

interface SharedItineraryViewProps {
  shareToken: string
}

interface SharedItineraryData {
  itinerary: {
    id: string
    name: string
    start_date?: string | null
    end_date?: string | null
    cover_image_url?: string | null
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
  const [viewMode, setViewMode] = useState<'moodboard' | 'map' | 'list'>('moodboard')
  const [selectedItem, setSelectedItem] = useState<SavedItem | null>(null)
  const [user, setUser] = useState<{ id: string } | null>(null)
  const [addingToAccount, setAddingToAccount] = useState(false)
  const [addToAccountError, setAddToAccountError] = useState<string | null>(null)
  const [addToAccountSuccess, setAddToAccountSuccess] = useState<{ itinerary_id: string; name: string } | null>(null)
  const [joiningCollaborator, setJoiningCollaborator] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [joinCollaboratorError, setJoinCollaboratorError] = useState<string | null>(null)
  const supabase = createClient()

  const isCollaborateShare = data?.share_type === 'collaborate'

  useEffect(() => {
    loadSharedItinerary()
  }, [shareToken])

  useEffect(() => {
    setIsMobile(isMobileDevice())
    const handleResize = () => setIsMobile(isMobileDevice())
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

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
          setError('This trip is no longer available or the link has been revoked.')
        } else {
          setError('Failed to load trip. Please try again later.')
        }
        return
      }

      const result = await response.json()
      setData(result)
    } catch (err) {
      console.error('Error loading shared trip:', err)
      setError('Failed to load trip. Please try again later.')
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

  // Filter items (Stage filter removed - liked/visited shown as icons on cards)
  const filteredItems = useMemo(() => {
    if (!data) return []
    return data.items
  }, [data])

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
          <p className="text-gray-600">Loading trip...</p>
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
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Unable to load trip</h2>
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
              <p className="text-xs text-gray-500 mt-1">Shared trip</p>
              {(data.itinerary.start_date || data.itinerary.end_date) && (
                <p className="text-sm text-gray-500 mt-1">
                  {data.itinerary.start_date && new Date(data.itinerary.start_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                  {data.itinerary.start_date && data.itinerary.end_date && ' – '}
                  {data.itinerary.end_date && new Date(data.itinerary.end_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                </p>
              )}
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

      {/* Trip cover hero - reduced height, title moved below */}
      <div className="relative -mx-4 sm:-mx-6 md:-mx-8 lg:-mx-12 overflow-hidden rounded-2xl">
        <div className="relative aspect-[21/11] min-h-[144px] md:min-h-[160px] bg-gray-100">
          {(data.itinerary.cover_image_url || data.items[0]?.screenshot_url || data.items[0]?.thumbnail_url) ? (
            <img
              src={data.itinerary.cover_image_url || data.items[0]?.screenshot_url || data.items[0]?.thumbnail_url || ''}
              alt=""
              className="absolute inset-0 w-full h-full object-cover"
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-gray-200 to-gray-300" />
          )}
          <div
            className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent"
            aria-hidden
          />
        </div>
      </div>

      {/* Title + Date below hero */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-2">
        <h2 className="text-2xl md:text-3xl font-semibold text-[#36454F]">{data.itinerary.name}</h2>
        {(data.itinerary.start_date || data.itinerary.end_date) && (
          <p className="mt-1 text-sm text-gray-500">
            {data.itinerary.start_date && new Date(data.itinerary.start_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
            {data.itinerary.start_date && data.itinerary.end_date && ' – '}
            {data.itinerary.end_date && new Date(data.itinerary.end_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
          </p>
        )}
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-6 md:pb-8">
        {/* View Mode Tabs */}
        <div className="mb-6">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode('moodboard')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                viewMode === 'moodboard'
                  ? 'bg-gray-900 text-white'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              Board
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

        {/* Stage filter removed - liked/visited shown as icons on cards */}

        {/* Moodboard View (default): grid with equal-height cards, 16px radius, title + location only */}
        {viewMode === 'moodboard' && (
          <div className="min-h-[200px] rounded-2xl p-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {filteredItems.length === 0 ? (
              <p className="text-gray-500 text-center py-12 col-span-full">No places in this trip yet.</p>
            ) : (
              filteredItems.map((item) => (
                <div key={item.id} className="min-h-0 flex">
                  <button
                    type="button"
                    onClick={() => setSelectedItem(item)}
                    className="w-full text-left bg-white rounded-[16px] border border-gray-200 overflow-hidden shadow-[0_2px_12px_rgba(0,0,0,0.06),0_1px_3px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.08),0_2px_4px_rgba(0,0,0,0.06)] transition-shadow focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2 flex flex-col h-full min-w-0"
                  >
                    <div className="aspect-[4/5] bg-gray-100 relative flex-shrink-0">
                      {item.screenshot_url || item.thumbnail_url ? (
                        <img
                          src={item.screenshot_url || item.thumbnail_url || ''}
                          alt={item.title || item.place_name || getHostname(item.url)}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <LinkPreview
                          url={item.url}
                          ogImage={item.thumbnail_url}
                          screenshotUrl={item.screenshot_url}
                          description={item.description}
                          platform={item.platform}
                          hideLabel
                        />
                      )}
                      {/* Liked / Visited overlay icons - top-right */}
                      {(item.liked || item.visited) && (
                        <div className="absolute top-2 right-2 flex gap-1.5 z-10">
                          {item.liked && (
                            <span className="flex items-center justify-center w-7 h-7 rounded-full bg-black/50 text-white" aria-label="Liked">
                              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                              </svg>
                            </span>
                          )}
                          {item.visited && (
                            <span className="flex items-center justify-center w-7 h-7 rounded-full bg-black/50 text-white" aria-label="Visited">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                              </svg>
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="p-3 flex-1 flex flex-col justify-center min-h-[52px]">
                      <p className="text-sm font-medium text-gray-900 line-clamp-2">
                        {item.title || item.place_name || getHostname(item.url)}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">
                        {item.location_city || item.location_country || item.formatted_address || '—'}
                      </p>
                    </div>
                  </button>
                </div>
              ))
            )}
          </div>
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

      {/* Place Detail Drawer (read-only for shared view) */}
      {selectedItem && (
        <PlaceDetailDrawer
          item={selectedItem}
          onClose={() => setSelectedItem(null)}
          isMobile={isMobile}
          readOnly
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


