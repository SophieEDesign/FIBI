'use client'

import { useEffect, useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { SavedItem, Itinerary } from '@/types/database'
import {
  DndContext,
  DragOverlay,
  useSensor,
  useSensors,
  PointerSensor,
  TouchSensor,
  closestCenter,
  DragEndEvent,
  DragStartEvent,
  useDraggable,
  useDroppable,
} from '@dnd-kit/core'
import { getHostname, isMobileDevice } from '@/lib/utils'
import Link from 'next/link'
import LinkPreview from '@/components/LinkPreview'

interface CalendarViewProps {
  user: any
}

interface CalendarDay {
  date: Date
  items: SavedItem[]
  isCurrentMonth: boolean
  isToday: boolean
}

export default function CalendarView({ user }: CalendarViewProps) {
  const [items, setItems] = useState<SavedItem[]>([])
  const [itineraries, setItineraries] = useState<Itinerary[]>([])
  const [selectedItineraryId, setSelectedItineraryId] = useState<string | null>(null) // null = "All"
  const [loading, setLoading] = useState(true)
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [activeId, setActiveId] = useState<string | null>(null)
  const [draggedItem, setDraggedItem] = useState<SavedItem | null>(null)
  const [selectedItem, setSelectedItem] = useState<SavedItem | null>(null)
  const [isMobile, setIsMobile] = useState(false)
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [itemToDate, setItemToDate] = useState<SavedItem | null>(null)
  const [showCreateItineraryModal, setShowCreateItineraryModal] = useState(false)
  const [newItineraryName, setNewItineraryName] = useState('')
  const [creatingItinerary, setCreatingItinerary] = useState(false)
  const [showShareModal, setShowShareModal] = useState(false)
  const [shareUrl, setShareUrl] = useState<string | null>(null)
  const [shareToken, setShareToken] = useState<string | null>(null)
  const [loadingShare, setLoadingShare] = useState(false)
  const [copied, setCopied] = useState(false)
  const [unplannedFilterType, setUnplannedFilterType] = useState<'all' | 'location' | 'category' | 'status'>('all')
  const [unplannedFilterValues, setUnplannedFilterValues] = useState<string[]>([]) // Multiple selections
  const [unplannedViewMode, setUnplannedViewMode] = useState<'grid' | 'list'>('list')
  const [showFilterDropdown, setShowFilterDropdown] = useState(false)
  const supabase = createClient()

  // Detect mobile device
  useEffect(() => {
    setIsMobile(isMobileDevice())
    const handleResize = () => {
      setIsMobile(isMobileDevice())
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Enable drag sensors for both desktop and mobile
  // TouchSensor has a delay to allow taps, but enables drag after brief hold
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 200, // Slight delay allows taps, but enables drag after brief hold
        tolerance: 8, // Small movement tolerance
      },
    })
  )

  useEffect(() => {
    if (user) {
      loadItems()
      loadItineraries()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  const loadItems = async () => {
    if (!user) return

    try {
      // Load all items - filtering by itinerary happens in useMemo
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

  const createItinerary = async (name: string) => {
    if (!user || !name.trim()) return null

    try {
      const { data, error } = await supabase
        .from('itineraries')
        .insert({
          user_id: user.id,
          name: name.trim(),
        })
        .select()
        .single()

      if (error) throw error

      if (data) {
        setItineraries((prev) => [data, ...prev])
        return data
      }
      return null
    } catch (error) {
      console.error('Error creating itinerary:', error)
      return null
    }
  }

  const handleCreateItinerary = async () => {
    if (!newItineraryName.trim()) return

    setCreatingItinerary(true)
    const newItinerary = await createItinerary(newItineraryName)
    setCreatingItinerary(false)

    if (newItinerary) {
      setSelectedItineraryId(newItinerary.id)
      setShowCreateItineraryModal(false)
      setNewItineraryName('')
    }
  }

  const handleShareItinerary = async () => {
    if (!selectedItineraryId) return

    setLoadingShare(true)
    setCopied(false)
    try {
      const response = await fetch('/api/itinerary/share', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itinerary_id: selectedItineraryId }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        console.error('Share API error:', response.status, errorData)
        throw new Error(errorData.error || 'Failed to generate share link')
      }

      const data = await response.json()
      setShareUrl(data.share_url)
      setShareToken(data.share_token)
      setShowShareModal(true)
    } catch (error: any) {
      console.error('Error sharing itinerary:', error)
      alert(error.message || 'Failed to generate share link. Please try again.')
    } finally {
      setLoadingShare(false)
    }
  }

  const handleCopyLink = async () => {
    if (!shareUrl) return

    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error('Error copying link:', error)
      alert('Failed to copy link. Please try again.')
    }
  }

  const handleRevokeShare = async () => {
    if (!shareToken) return

    try {
      const response = await fetch(`/api/itinerary/share/${shareToken}`, {
        method: 'DELETE',
        credentials: 'include',
      })

      if (!response.ok) {
        throw new Error('Failed to revoke share link')
      }

      setShareUrl(null)
      setShareToken(null)
      setShowShareModal(false)
    } catch (error) {
      console.error('Error revoking share:', error)
      alert('Failed to revoke share link. Please try again.')
    }
  }

  // Load existing share when itinerary is selected
  useEffect(() => {
    if (!selectedItineraryId || selectedItineraryId === null) {
      setShareUrl(null)
      setShareToken(null)
      return
    }

    // Check if there's an existing share for this itinerary
    const checkExistingShare = async () => {
      try {
        const { data: shares, error } = await supabase
          .from('itinerary_shares')
          .select('share_token')
          .eq('itinerary_id', selectedItineraryId)
          .is('revoked_at', null)
          .maybeSingle()

        if (!error && shares) {
          const url = `${process.env.NEXT_PUBLIC_APP_URL || window.location.origin}/share/itinerary/${shares.share_token}`
          setShareUrl(url)
          setShareToken(shares.share_token)
        } else {
          setShareUrl(null)
          setShareToken(null)
        }
      } catch (error) {
        console.error('Error checking existing share:', error)
        setShareUrl(null)
        setShareToken(null)
      }
    }

    checkExistingShare()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedItineraryId])

  // Filter items based on selected itinerary
  const filteredItems = useMemo(() => {
    if (selectedItineraryId === null) {
      // "All" tab - show all items
      return items
    } else {
      // Show only items in the selected itinerary
      return items.filter((item) => item.itinerary_id === selectedItineraryId)
    }
  }, [items, selectedItineraryId])

  // Generate calendar days for current month
  const calendarDays = useMemo(() => {
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
  }, [currentMonth, filteredItems])

  // Get unplanned items (items without planned_date) with filtering
  // Show ALL unplanned items regardless of itinerary, but respect the filter dropdowns
  const unplannedItems = useMemo(() => {
    // Use all items, not filteredItems, so we show all unplanned items regardless of itinerary
    let unplanned = items.filter((item) => !item.planned_date)
    
    // Apply multiple filters - items must match at least one selected value in each active filter type
    if (unplannedFilterType === 'location' && unplannedFilterValues.length > 0) {
      unplanned = unplanned.filter((item) => {
        const itemLocations = [
          item.location_city?.toLowerCase(),
          item.location_country?.toLowerCase(),
          item.place_name?.toLowerCase(),
          item.formatted_address?.toLowerCase(),
        ].filter(Boolean)
        
        return unplannedFilterValues.some((filterValue) => {
          const filterLower = filterValue.toLowerCase()
          return itemLocations.some((loc) => loc && (loc === filterLower || loc.includes(filterLower)))
        })
      })
    } else if (unplannedFilterType === 'category' && unplannedFilterValues.length > 0) {
      unplanned = unplanned.filter((item) => {
        if (!item.category) return false
        try {
          const categories = JSON.parse(item.category)
          const categoryArray = Array.isArray(categories) ? categories : [categories]
          const itemCategories = categoryArray.map((cat: string) => cat.toLowerCase())
          return unplannedFilterValues.some((filterValue) =>
            itemCategories.includes(filterValue.toLowerCase())
          )
        } catch {
          if (!item.category) return false
          return unplannedFilterValues.some((filterValue) =>
            item.category.toLowerCase() === filterValue.toLowerCase()
          )
        }
      })
    } else if (unplannedFilterType === 'status' && unplannedFilterValues.length > 0) {
      unplanned = unplanned.filter((item) => {
        if (!item.status) return false
        try {
          const statuses = JSON.parse(item.status)
          const statusArray = Array.isArray(statuses) ? statuses : [statuses]
          const itemStatuses = statusArray.map((stat: string) => stat.toLowerCase())
          return unplannedFilterValues.some((filterValue) =>
            itemStatuses.includes(filterValue.toLowerCase())
          )
        } catch {
          if (!item.status) return false
          return unplannedFilterValues.some((filterValue) =>
            item.status.toLowerCase() === filterValue.toLowerCase()
          )
        }
      })
    }
    
    return unplanned
  }, [items, unplannedFilterType, unplannedFilterValues])

  // Extract unique filter values from ALL unplanned items (not just current itinerary)
  const filterOptions = useMemo(() => {
    const locations = new Set<string>()
    const categories = new Set<string>()
    const statuses = new Set<string>()
    
    // Use all items, not filteredItems, so filter options include all unplanned items
    items
      .filter((item) => !item.planned_date)
      .forEach((item) => {
        // Extract locations
        if (item.location_city) locations.add(item.location_city)
        if (item.location_country) locations.add(item.location_country)
        if (item.place_name) locations.add(item.place_name)
        
        // Extract categories
        if (item.category) {
          try {
            const cats = JSON.parse(item.category)
            const catArray = Array.isArray(cats) ? cats : [cats]
            catArray.forEach((cat: string) => categories.add(cat))
          } catch {
            categories.add(item.category)
          }
        }
        
        // Extract statuses
        if (item.status) {
          try {
            const stats = JSON.parse(item.status)
            const statArray = Array.isArray(stats) ? stats : [stats]
            statArray.forEach((stat: string) => statuses.add(stat))
          } catch {
            statuses.add(item.status)
          }
        }
      })
    
    return {
      locations: Array.from(locations).sort(),
      categories: Array.from(categories).sort(),
      statuses: Array.from(statuses).sort(),
    }
  }, [items])

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event
    setActiveId(active.id as string)
    const item = items.find((i) => i.id === active.id)
    setDraggedItem(item || null)
  }

  // Assign date to item (used for both drag-and-drop and tap-based selection)
  // If an itinerary is selected, also assign the item to that itinerary
  const assignDateToItem = async (itemId: string, dateStr: string | null) => {
    try {
      const updateData: { planned_date: string | null; itinerary_id?: string | null } = {
        planned_date: dateStr,
      }
      
      // If an itinerary is selected and we're assigning a date, also assign to itinerary
      if (selectedItineraryId && dateStr) {
        updateData.itinerary_id = selectedItineraryId
      }
      // If setting date to null (unplanned), don't change itinerary_id
      
      const { error } = await supabase
        .from('saved_items')
        .update(updateData)
        .eq('id', itemId)

      if (error) throw error

      // Optimistic update
      setItems((prev) =>
        prev.map((item) =>
          item.id === itemId 
            ? { ...item, planned_date: dateStr, ...(selectedItineraryId && dateStr ? { itinerary_id: selectedItineraryId } : {}) }
            : item
        )
      )
    } catch (error) {
      console.error('Error updating planned date:', error)
      loadItems() // Reload on error
    }
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    setActiveId(null)
    setDraggedItem(null)

    if (!over) return

    const itemId = active.id as string
    const targetDate = over.id as string

    // If dropped on "unplanned" area, set planned_date to null
    if (targetDate === 'unplanned') {
      await assignDateToItem(itemId, null)
      return
    }

    // Parse date from target (format: "date-YYYY-MM-DD")
    if (typeof targetDate === 'string' && targetDate.startsWith('date-')) {
      const dateStr = targetDate.replace('date-', '')
      await assignDateToItem(itemId, dateStr)
    }
  }

  // Handle tap on item to show date picker (mobile only)
  const handleItemTapForDate = (item: SavedItem) => {
    if (isMobile) {
      setItemToDate(item)
      setShowDatePicker(true)
    }
  }

  // Handle date selection from picker (mobile)
  const handleDateSelected = async (date: Date | null) => {
    if (!itemToDate) return

    const dateStr = date ? date.toISOString().split('T')[0] : null
    await assignDateToItem(itemToDate.id, dateStr)
    setShowDatePicker(false)
    setItemToDate(null)
  }

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

  const handleDownloadCalendar = async () => {
    try {
      const response = await fetch('/api/calendar/download', {
        credentials: 'include',
      })
      
      if (!response.ok) {
        if (response.status === 401) {
          const errorData = await response.json().catch(() => ({}))
          console.error('Authentication error:', errorData)
          alert('Please sign in to download your calendar')
          return
        }
        const errorData = await response.json().catch(() => ({}))
        console.error('Download error:', response.status, errorData)
        throw new Error(errorData.error || 'Failed to download calendar')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'fibi-calendar.ics'
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error('Error downloading calendar:', error)
      alert('Failed to download calendar. Please try again.')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8 pb-24 md:pb-8">
        {/* Itinerary Tabs */}
        <div className="mb-6">
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">
            <button
              onClick={() => setSelectedItineraryId(null)}
              className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                selectedItineraryId === null
                  ? 'bg-gray-900 text-white'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              All
            </button>
            {itineraries.map((itinerary) => (
              <div key={itinerary.id} className="flex items-center gap-1">
                <button
                  onClick={() => setSelectedItineraryId(itinerary.id)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                    selectedItineraryId === itinerary.id
                      ? 'bg-gray-900 text-white'
                      : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {itinerary.name}
                </button>
                {selectedItineraryId === itinerary.id && (
                  <button
                    onClick={handleShareItinerary}
                    disabled={loadingShare}
                    className="p-2 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors disabled:opacity-50"
                    title="Share itinerary"
                  >
                    {loadingShare ? (
                      <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                      </svg>
                    )}
                  </button>
                )}
              </div>
            ))}
            <button
              onClick={() => setShowCreateItineraryModal(true)}
              className="px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 transition-colors flex items-center gap-1"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              New
            </button>
          </div>
        </div>

        {/* Drag and drop context - works on both desktop and mobile */}
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
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

            <div className="flex items-center gap-2">
              <button
                onClick={handleDownloadCalendar}
                className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                title="Download calendar"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                  />
                </svg>
                <span className="hidden sm:inline">Download</span>
              </button>
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
          </div>

          {/* Unplanned Items Section - Always Visible */}
          <div className="mb-6 bg-white rounded-xl border border-gray-200 p-4 md:p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <h3 className="text-lg font-semibold text-gray-900">
                  Unplanned Places
                </h3>
                <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded-full">
                  {unplannedItems.length}
                </span>
              </div>
              
              <div className="flex items-center gap-2">
                {/* View Mode Toggle */}
                <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden">
                  <button
                    onClick={() => setUnplannedViewMode('list')}
                    className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                      unplannedViewMode === 'list'
                        ? 'bg-gray-900 text-white'
                        : 'bg-white text-gray-700 hover:bg-gray-50'
                    }`}
                    title="List view"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                  </button>
                  <button
                    onClick={() => setUnplannedViewMode('grid')}
                    className={`px-3 py-1.5 text-xs font-medium transition-colors border-l border-gray-300 ${
                      unplannedViewMode === 'grid'
                        ? 'bg-gray-900 text-white'
                        : 'bg-white text-gray-700 hover:bg-gray-50'
                    }`}
                    title="Grid view"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
            
            {/* Filter Controls - Multi-select */}
            <div className="mb-4 space-y-3">
              <div className="flex items-center gap-2 flex-wrap">
                <select
                  value={unplannedFilterType}
                  onChange={(e) => {
                    setUnplannedFilterType(e.target.value as 'all' | 'location' | 'category' | 'status')
                    setUnplannedFilterValues([])
                  }}
                  className="text-sm px-3 py-2 border border-gray-400 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-gray-900 focus:border-gray-900"
                >
                  <option value="all">All Places</option>
                  <option value="location">Filter by Location</option>
                  <option value="category">Filter by Category</option>
                  <option value="status">Filter by Status</option>
                </select>
                
                {unplannedFilterValues.length > 0 && (
                  <button
                    onClick={() => {
                      setUnplannedFilterValues([])
                    }}
                    className="px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors flex items-center gap-1"
                    title="Clear all filters"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    <span>Clear ({unplannedFilterValues.length})</span>
                  </button>
                )}
              </div>
              
              {unplannedFilterType !== 'all' && (
                <div className="relative">
                  <div className="flex flex-wrap gap-2">
                    {(unplannedFilterType === 'location' ? filterOptions.locations : 
                      unplannedFilterType === 'category' ? filterOptions.categories : 
                      filterOptions.statuses).map((option) => {
                      const isSelected = unplannedFilterValues.includes(option)
                      return (
                        <button
                          key={option}
                          onClick={() => {
                            if (isSelected) {
                              setUnplannedFilterValues(unplannedFilterValues.filter(v => v !== option))
                            } else {
                              setUnplannedFilterValues([...unplannedFilterValues, option])
                            }
                          }}
                          className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors flex items-center gap-2 ${
                            isSelected
                              ? 'bg-gray-900 text-white'
                              : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          <svg
                            className={`w-4 h-4 ${isSelected ? 'opacity-100' : 'opacity-0'}`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                          {option}
                        </button>
                      )
                    })}
                  </div>
                  {unplannedFilterValues.length > 0 && (
                    <p className="text-xs text-gray-500 mt-2">
                      Showing items matching {unplannedFilterValues.length} selected {unplannedFilterType === 'location' ? 'location' : unplannedFilterType === 'category' ? 'category' : 'status'}{unplannedFilterValues.length > 1 ? 'ies' : 'y'}: {unplannedFilterValues.slice(0, 3).join(', ')}{unplannedFilterValues.length > 3 ? ` +${unplannedFilterValues.length - 3} more` : ''}
                    </p>
                  )}
                </div>
              )}
            </div>
            
            {/* Unplanned Items Display */}
            {unplannedItems.length > 0 ? (
              <UnplannedDropZone viewMode={unplannedViewMode}>
                {unplannedViewMode === 'list' ? (
                  <div className="space-y-2">
                    {unplannedItems.map((item) => (
                      <PlaceListItem
                        key={item.id}
                        item={item}
                        isDragging={activeId === item.id}
                        onSelect={() => setSelectedItem(item)}
                        onAssignDate={isMobile ? () => handleItemTapForDate(item) : undefined}
                        isMobile={isMobile}
                      />
                    ))}
                  </div>
                ) : (
                  unplannedItems.map((item) => (
                    <PlaceCard
                      key={item.id}
                      item={item}
                      isDragging={activeId === item.id}
                      onSelect={() => setSelectedItem(item)}
                      onAssignDate={isMobile ? () => handleItemTapForDate(item) : undefined}
                      isMobile={isMobile}
                    />
                  ))
                )}
              </UnplannedDropZone>
            ) : (
              <div className="p-8 border-2 border-dashed border-gray-300 rounded-lg text-center">
                <p className="text-sm text-gray-500">
                  {unplannedFilterType === 'all' 
                    ? 'No unplanned places. All places are scheduled!'
                    : 'No items match the selected filter'}
                </p>
              </div>
            )}
          </div>

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
              {calendarDays.map((day, index) => {
                const dateId = `date-${day.date.toISOString().split('T')[0]}`
                return (
                  <CalendarDayDropZone key={index} dateId={dateId} day={day}>
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
                          isDragging={activeId === item.id}
                          compact
                          onSelect={() => setSelectedItem(item)}
                          onAssignDate={isMobile ? () => handleItemTapForDate(item) : undefined}
                          isMobile={isMobile}
                        />
                      ))}
                    </div>
                  </CalendarDayDropZone>
                )
              })}
            </div>
          </div>

          {/* Drag Overlay */}
          <DragOverlay>
            {draggedItem ? (
              <PlaceCard item={draggedItem} isDragging={true} overlay />
            ) : null}
          </DragOverlay>
        </DndContext>

        {/* Place Preview Modal */}
        {selectedItem && (
          <PlacePreviewModal
            item={selectedItem}
            onClose={() => setSelectedItem(null)}
          />
        )}

        {/* Date Picker Modal (Mobile) */}
        {showDatePicker && itemToDate && (
          <DatePickerModal
            item={itemToDate}
            currentDate={itemToDate.planned_date ? new Date(itemToDate.planned_date) : null}
            onSelect={handleDateSelected}
            onClose={() => {
              setShowDatePicker(false)
              setItemToDate(null)
            }}
          />
        )}

        {/* Create Itinerary Modal */}
        {showCreateItineraryModal && (
          <div
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setShowCreateItineraryModal(false)
                setNewItineraryName('')
              }
            }}
          >
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Create Itinerary</h2>
              <div className="space-y-4">
                <div>
                  <label htmlFor="itinerary-name" className="block text-sm font-medium text-gray-700 mb-2">
                    Name
                  </label>
                  <input
                    id="itinerary-name"
                    type="text"
                    value={newItineraryName}
                    onChange={(e) => setNewItineraryName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && newItineraryName.trim()) {
                        handleCreateItinerary()
                      }
                    }}
                    placeholder="e.g., Weekend Trip, Italy Ideas"
                    className="w-full px-4 py-2 border border-gray-400 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900 text-gray-900 bg-white"
                    autoFocus
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={handleCreateItinerary}
                    disabled={!newItineraryName.trim() || creatingItinerary}
                    className="flex-1 bg-gray-900 text-white py-2 px-4 rounded-lg font-medium hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {creatingItinerary ? 'Creating...' : 'Create'}
                  </button>
                  <button
                    onClick={() => {
                      setShowCreateItineraryModal(false)
                      setNewItineraryName('')
                    }}
                    className="px-6 py-2 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Share Itinerary Modal */}
        {showShareModal && (
          <div
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setShowShareModal(false)
              }
            }}
          >
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Share Itinerary</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Share Link
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={shareUrl || ''}
                      readOnly
                      className="flex-1 px-4 py-2 border border-gray-400 rounded-lg bg-gray-50 text-sm text-gray-900"
                    />
                    <button
                      onClick={handleCopyLink}
                      className="px-4 py-2 bg-gray-900 text-white rounded-lg font-medium hover:bg-gray-800 transition-colors whitespace-nowrap"
                    >
                      {copied ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Anyone with this link can view your itinerary. They won&apos;t be able to edit it.
                  </p>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={handleRevokeShare}
                    className="flex-1 px-4 py-2 border border-red-300 text-red-700 rounded-lg font-medium hover:bg-red-50 transition-colors"
                  >
                    Revoke Link
                  </button>
                  <button
                    onClick={() => setShowShareModal(false)}
                    className="px-6 py-2 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Empty States */}
        {!loading && items.length === 0 && (
          <div className="text-center py-12 md:py-16">
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
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            </div>
            <h2 className="text-xl md:text-2xl font-semibold text-gray-900 mb-2">
              No saved places yet
            </h2>
            <p className="text-sm md:text-base text-gray-600 mb-6">
              Add your first place to start planning your calendar.
            </p>
            <Link
              href="/app/add"
              className="inline-block bg-gray-900 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors"
            >
              Add your first place
            </Link>
          </div>
        )}

        {!loading && items.length > 0 && unplannedItems.length === items.length && (
          <div className="text-center py-8 md:py-12 mt-6">
            <div className="mb-4">
              <svg
                className="mx-auto h-10 w-10 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"
                />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {isMobile ? 'Tap or drag places to plan them' : 'Drag places onto the calendar'}
            </h3>
            <p className="text-sm text-gray-600 max-w-md mx-auto">
              {isMobile
                ? 'Tap any place in the Unplanned Places section above to assign it to a date, or hold and drag to move it directly onto a calendar date. You can move places between dates or remove them by dragging back to unplanned.'
                : 'Drag any place from the Unplanned Places section above onto a date to plan it. You can move places between dates or remove them by dragging back to unplanned.'}
            </p>
          </div>
        )}
      </main>
    </div>
  )
}

// Unplanned Drop Zone Component
function UnplannedDropZone({ children, viewMode }: { children: React.ReactNode; viewMode: 'grid' | 'list' }) {
  const { setNodeRef, isOver } = useDroppable({
    id: 'unplanned',
  })

  return (
    <div
      ref={setNodeRef}
      className={`min-h-[100px] p-4 rounded-lg border-2 border-dashed transition-colors ${
        isOver ? 'border-blue-400 bg-blue-50' : 'border-gray-300 bg-gray-50'
      } ${viewMode === 'grid' ? 'flex flex-wrap gap-3' : ''}`}
    >
      {children}
    </div>
  )
}

// Calendar Day Drop Zone Component
function CalendarDayDropZone({
  dateId,
  day,
  children,
}: {
  dateId: string
  day: CalendarDay
  children: React.ReactNode
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: dateId,
  })

  return (
    <div
      ref={setNodeRef}
      className={`min-h-[80px] md:min-h-[120px] p-1 md:p-2 border-r border-b border-gray-200 transition-colors ${
        day.isCurrentMonth ? 'bg-white' : 'bg-gray-50'
      } ${day.isToday ? 'bg-blue-50' : ''} ${isOver ? 'bg-blue-100 border-blue-300' : ''}`}
    >
      {children}
    </div>
  )
}

// Place Card Component (draggable on desktop, tappable on mobile)
interface PlaceCardProps {
  item: SavedItem
  isDragging: boolean
  compact?: boolean
  overlay?: boolean
  onSelect?: () => void
  onAssignDate?: () => void
  isMobile?: boolean
}

function PlaceCard({ item, isDragging, compact = false, overlay = false, onSelect, onAssignDate, isMobile = false }: PlaceCardProps) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: item.id,
    // Drag enabled on both desktop and mobile - TouchSensor handles mobile touch
  })

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
      }
    : undefined

  const displayTitle = item.title || getHostname(item.url)
  const imageUrl = item.screenshot_url || item.thumbnail_url

  // Handle click/tap
  // On mobile: tap shows date picker, drag (hold + move) enables drag-and-drop
  // On desktop: click shows preview, drag enables drag-and-drop
  const handleClick = (e: React.MouseEvent) => {
    // Only handle click if not currently dragging
    if (isDragging) {
      e.stopPropagation()
      return
    }
    
    e.stopPropagation()
    
    // On mobile, tap shows date picker; on desktop, tap shows preview
    if (isMobile && onAssignDate) {
      onAssignDate()
    } else if (onSelect) {
      onSelect()
    }
  }

  if (overlay) {
    // Drag overlay - larger, more visible
    return (
      <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-2 w-48 opacity-90">
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
        <p className="text-sm font-medium text-gray-900 line-clamp-2">{displayTitle}</p>
      </div>
    )
  }

  if (compact) {
    // Compact version for calendar cells
    return (
      <div
        ref={setNodeRef}
        style={style}
        {...listeners}
        {...attributes}
        onClick={handleClick}
        className={`bg-white rounded border border-gray-200 p-1.5 cursor-pointer hover:shadow-sm transition-shadow ${
          isDragging ? 'opacity-50' : ''
        }`}
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

  // Full version for unplanned section
  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      onClick={handleClick}
      className={`bg-white rounded-lg border border-gray-200 p-2 w-32 md:w-40 cursor-pointer hover:shadow-md transition-shadow ${
        isDragging ? 'opacity-50' : ''
      }`}
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

// Place List Item Component (for list view in unplanned section)
interface PlaceListItemProps {
  item: SavedItem
  isDragging: boolean
  onSelect?: () => void
  onAssignDate?: () => void
  isMobile?: boolean
}

function PlaceListItem({ item, isDragging, onSelect, onAssignDate, isMobile = false }: PlaceListItemProps) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: item.id,
  })

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
      }
    : undefined

  const displayTitle = item.title || getHostname(item.url)
  const imageUrl = item.screenshot_url || item.thumbnail_url

  // Parse categories and statuses
  const parseCategories = (cat: string | null): string[] => {
    if (!cat) return []
    try {
      const parsed = JSON.parse(cat)
      if (Array.isArray(parsed)) return parsed
      return [parsed]
    } catch {
      return [cat]
    }
  }
  
  const parseStatuses = (stat: string | null): string[] => {
    if (!stat) return []
    try {
      const parsed = JSON.parse(stat)
      if (Array.isArray(parsed)) return parsed
      return [parsed]
    } catch {
      return [stat]
    }
  }

  const categories = parseCategories(item.category)
  const statuses = parseStatuses(item.status)

  const handleClick = (e: React.MouseEvent) => {
    if (isDragging) {
      e.stopPropagation()
      return
    }
    
    e.stopPropagation()
    
    if (isMobile && onAssignDate) {
      onAssignDate()
    } else if (onSelect) {
      onSelect()
    }
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      onClick={handleClick}
      className={`bg-white rounded-lg border border-gray-200 p-3 cursor-pointer hover:shadow-md hover:border-gray-300 transition-all ${
        isDragging ? 'opacity-50' : ''
      }`}
    >
      <div className="flex items-start gap-3">
        {/* Thumbnail */}
        <div className="w-20 h-20 md:w-24 md:h-24 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
          {imageUrl ? (
            <img
              src={imageUrl}
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

        {/* Content */}
        <div className="flex-1 min-w-0">
          <h4 className="text-sm md:text-base font-semibold text-gray-900 mb-1 line-clamp-1">
            {displayTitle}
          </h4>
          
          {item.description && (
            <p className="text-xs md:text-sm text-gray-600 mb-2 line-clamp-2">
              {item.description}
            </p>
          )}

          {/* Location */}
          {(item.place_name || item.formatted_address || item.location_city) && (
            <div className="flex items-center gap-1 mb-2">
              <svg className="w-3 h-3 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <p className="text-xs text-gray-600 truncate">
                {item.place_name || item.formatted_address || 
                 (item.location_city && item.location_country 
                   ? `${item.location_city}, ${item.location_country}` 
                   : item.location_city || item.location_country || '')}
              </p>
            </div>
          )}

          {/* Categories and Statuses */}
          {(categories.length > 0 || statuses.length > 0) && (
            <div className="flex flex-wrap gap-1.5">
              {categories.map((category, index) => (
                <span
                  key={`cat-${index}`}
                  className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800"
                >
                  {category}
                </span>
              ))}
              {statuses.map((status, index) => (
                <span
                  key={`stat-${index}`}
                  className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                >
                  {status}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Drag Handle Indicator */}
        <div className="flex-shrink-0 text-gray-400">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
          </svg>
        </div>
      </div>
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

  // Parse categories and statuses (support both single values and arrays)
  const parseCategories = (cat: string | null): string[] => {
    if (!cat) return []
    try {
      const parsed = JSON.parse(cat)
      if (Array.isArray(parsed)) return parsed
      return [parsed]
    } catch {
      return [cat]
    }
  }
  
  const parseStatuses = (stat: string | null): string[] => {
    if (!stat) return []
    try {
      const parsed = JSON.parse(stat)
      if (Array.isArray(parsed)) return parsed
      return [parsed]
    } catch {
      return [stat]
    }
  }

  const categories = parseCategories(item.category)
  const statuses = parseStatuses(item.status)

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

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={handleBackdropClick}
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
          {/* Close button overlay */}
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
            {/* Title */}
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-1">{displayTitle}</h2>
              {item.description && (
                <p className="text-sm text-gray-600 leading-relaxed">{item.description}</p>
              )}
            </div>

            {/* Location */}
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
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-0.5">Location</p>
                  <p className="text-sm text-gray-900">
                    {item.place_name || item.formatted_address || 
                     (item.location_city && item.location_country 
                       ? `${item.location_city}, ${item.location_country}` 
                       : item.location_city || item.location_country || '')}
                  </p>
                </div>
              </div>
            )}

            {/* Category and Status */}
            {(categories.length > 0 || statuses.length > 0) && (
              <div className="flex flex-wrap gap-2">
                {categories.map((category, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800"
                  >
                    {category}
                  </span>
                ))}
                {statuses.map((status, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                  >
                    {status}
                  </span>
                ))}
              </div>
            )}

            {/* Planned Date */}
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
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-0.5">Planned Date</p>
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
          <div className="flex gap-3">
            <Link
              href={`/item/${item.id}`}
              className="flex-1 bg-gray-900 text-white py-3 px-4 rounded-lg font-medium hover:bg-gray-800 transition-colors text-center"
              onClick={onClose}
            >
              View Full Details
            </Link>
            {item.url && (
              <a
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-3 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-white transition-colors whitespace-nowrap"
              >
                Open Link
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// Date Picker Modal Component (Mobile)
interface DatePickerModalProps {
  item: SavedItem
  currentDate: Date | null
  onSelect: (date: Date | null) => void
  onClose: () => void
}

function DatePickerModal({ item, currentDate, onSelect, onClose }: DatePickerModalProps) {
  const [selectedDate, setSelectedDate] = useState<Date | null>(currentDate)
  const [viewMonth, setViewMonth] = useState(new Date(currentDate || new Date()))

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
      setSelectedDate(null)
    } else {
      setSelectedDate(date)
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
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Assign Date</h2>
            <p className="text-sm text-gray-600 mt-1 line-clamp-1">{displayTitle}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Calendar */}
        <div className="flex-1 overflow-y-auto p-5">
          {/* Month Navigation */}
          <div className="mb-4 flex items-center justify-between">
            <button
              onClick={() => {
                const newDate = new Date(viewMonth)
                newDate.setMonth(viewMonth.getMonth() - 1)
                setViewMonth(newDate)
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
                setViewMonth(newDate)
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

        {/* Actions */}
        <div className="border-t border-gray-200 p-5 bg-gray-50">
          <div className="flex gap-3">
            <button
              onClick={() => onSelect(null)}
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-white transition-colors"
            >
              Remove from calendar
            </button>
            <button
              onClick={() => onSelect(selectedDate)}
              className="flex-1 bg-gray-900 text-white py-3 px-4 rounded-lg font-medium hover:bg-gray-800 transition-colors"
            >
              {selectedDate
                ? `Assign ${selectedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
                : 'Select date'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

