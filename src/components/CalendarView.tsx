'use client'

import { useEffect, useState, useMemo, useRef } from 'react'
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
import { useRouter } from 'next/navigation'

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
  // Initialize selectedItineraryId from localStorage if available
  const [selectedItineraryId, setSelectedItineraryIdState] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('calendar_selected_itinerary_id')
      return saved === 'null' ? null : saved
    }
    return null
  })
  // Wrapper to persist to localStorage when itinerary changes
  const setSelectedItineraryId = (id: string | null) => {
    setSelectedItineraryIdState(id)
    if (typeof window !== 'undefined') {
      if (id === null) {
        localStorage.removeItem('calendar_selected_itinerary_id')
      } else {
        localStorage.setItem('calendar_selected_itinerary_id', id)
      }
    }
  }
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
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteName, setInviteName] = useState('')
  const [sendingInvite, setSendingInvite] = useState(false)
  const [inviteSent, setInviteSent] = useState(false)
  const [inviteError, setInviteError] = useState<string | null>(null)
  const [unplannedLocationFilters, setUnplannedLocationFilters] = useState<string[]>([])
  const [unplannedCategoryFilters, setUnplannedCategoryFilters] = useState<string[]>([])
  const [unplannedStatusFilters, setUnplannedStatusFilters] = useState<string[]>([])
  const [unplannedViewMode, setUnplannedViewMode] = useState<'grid' | 'list'>('grid')
  const [showLocationDropdown, setShowLocationDropdown] = useState(false)
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false)
  const [showStageDropdown, setShowStageDropdown] = useState(false)
  const [isUnplannedExpanded, setIsUnplannedExpanded] = useState(false) // Mobile dropdown state
  const [locationSearch, setLocationSearch] = useState('')
  const [categorySearch, setCategorySearch] = useState('')
  const [stageSearch, setStageSearch] = useState('')
  const locationDropdownRef = useRef<HTMLDivElement>(null)
  const categoryDropdownRef = useRef<HTMLDivElement>(null)
  const stageDropdownRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()
  const router = useRouter()

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
      console.log('CalendarView: User available, loading data', { userId: user.id })
      loadItems()
      loadItineraries()
    } else {
      console.log('CalendarView: No user available yet')
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
        // Validate that the selected itinerary still exists
        if (selectedItineraryId && data) {
          const itineraryExists = data.some((it: Itinerary) => it.id === selectedItineraryId)
          if (!itineraryExists) {
            // Itinerary no longer exists, reset to "All"
            setSelectedItineraryId(null)
          }
        }
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
    if (!selectedItineraryId) {
      console.warn('Cannot share: No itinerary selected')
      return
    }

    setLoadingShare(true)
    setCopied(false)
    try {
      console.log('Sharing itinerary:', selectedItineraryId)
      
      // Get the session token to pass as Authorization header
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      
      if (sessionError || !session) {
        console.error('No session available:', sessionError)
        throw new Error('You must be logged in to share itineraries')
      }

      const headers: HeadersInit = { 
        'Content-Type': 'application/json',
      }
      
      // Add Authorization header with the access token
      if (session.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`
      }

      const response = await fetch('/api/itinerary/share', {
        method: 'POST',
        credentials: 'include',
        headers,
        body: JSON.stringify({ itinerary_id: selectedItineraryId }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        console.error('Share API error:', response.status, errorData)
        throw new Error(errorData.error || 'Failed to generate share link')
      }

      const data = await response.json()
      console.log('Share response:', data)
      if (!data.share_url || !data.share_token) {
        throw new Error('Invalid response from server')
      }
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
      // Fallback for older browsers
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(shareUrl)
      } else {
        // Fallback: create temporary textarea element
        const textarea = document.createElement('textarea')
        textarea.value = shareUrl
        textarea.style.position = 'fixed'
        textarea.style.opacity = '0'
        document.body.appendChild(textarea)
        textarea.select()
        document.execCommand('copy')
        document.body.removeChild(textarea)
      }
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error('Error copying link:', error)
      // Try fallback method
      try {
        const textarea = document.createElement('textarea')
        textarea.value = shareUrl
        textarea.style.position = 'fixed'
        textarea.style.opacity = '0'
        document.body.appendChild(textarea)
        textarea.select()
        document.execCommand('copy')
        document.body.removeChild(textarea)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      } catch (fallbackError) {
        alert('Failed to copy link. Please select and copy it manually.')
      }
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
          const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin
          const url = `${baseUrl}/share/itinerary/${shares.share_token}`
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
  // Apply all active filters with AND logic (items must match all active filter types)
  const unplannedItems = useMemo(() => {
    // Use all items, not filteredItems, so we show all unplanned items regardless of itinerary
    let unplanned = items.filter((item) => !item.planned_date)
    
    // Apply location filter (if any locations selected)
    if (unplannedLocationFilters.length > 0) {
      unplanned = unplanned.filter((item) => {
        const itemLocations = [
          item.location_city?.toLowerCase(),
          item.location_country?.toLowerCase(),
          item.place_name?.toLowerCase(),
          item.formatted_address?.toLowerCase(),
        ].filter(Boolean)
        
        return unplannedLocationFilters.some((filterValue) => {
          const filterLower = filterValue.toLowerCase()
          return itemLocations.some((loc) => loc && (loc === filterLower || loc.includes(filterLower)))
        })
      })
    }
    
    // Apply category filter (if any categories selected)
    if (unplannedCategoryFilters.length > 0) {
      unplanned = unplanned.filter((item) => {
        if (!item.category) return false
        const category = item.category // Store in local variable for type narrowing
        try {
          const categories = JSON.parse(category)
          const categoryArray = Array.isArray(categories) ? categories : [categories]
          const itemCategories = categoryArray.map((cat: string) => cat.toLowerCase())
          return unplannedCategoryFilters.some((filterValue) =>
            itemCategories.includes(filterValue.toLowerCase())
          )
        } catch {
          return unplannedCategoryFilters.some((filterValue) =>
            category.toLowerCase() === filterValue.toLowerCase()
          )
        }
      })
    }
    
    // Apply status filter (if any statuses selected)
    if (unplannedStatusFilters.length > 0) {
      unplanned = unplanned.filter((item) => {
        if (!item.status) return false
        const status = item.status // Store in local variable for type narrowing
        try {
          const statuses = JSON.parse(status)
          const statusArray = Array.isArray(statuses) ? statuses : [statuses]
          const itemStatuses = statusArray.map((stat: string) => stat.toLowerCase())
          return unplannedStatusFilters.some((filterValue) =>
            itemStatuses.includes(filterValue.toLowerCase())
          )
        } catch {
          return unplannedStatusFilters.some((filterValue) =>
            status.toLowerCase() === filterValue.toLowerCase()
          )
        }
      })
    }
    
    return unplanned
  }, [items, unplannedLocationFilters, unplannedCategoryFilters, unplannedStatusFilters])

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
  // When assigning a date: set status to "Planned"
  // When removing date: set status to "To plan"
  const assignDateToItem = async (itemId: string, dateStr: string | null) => {
    try {
      // Parse current status from item
      const item = items.find(i => i.id === itemId)
      let currentStatuses: string[] = []
      if (item?.status) {
        try {
          const parsed = JSON.parse(item.status)
          currentStatuses = Array.isArray(parsed) ? parsed : [parsed]
        } catch {
          currentStatuses = [item.status]
        }
      }

      // Update status based on date assignment
      let newStatuses: string[] = []
      if (dateStr) {
        // Assigning date: set status to "Planned"
        // Remove "To plan" if present, add "Planned" if not present
        newStatuses = currentStatuses.filter(s => s !== 'To plan')
        if (!newStatuses.includes('Planned')) {
          newStatuses.push('Planned')
        }
      } else {
        // Removing date: revert to "To plan"
        // Remove "Planned" if present, add "To plan" if not present
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
            ? { 
                ...item, 
                planned_date: dateStr, 
                status: updateData.status || null,
                ...(selectedItineraryId && dateStr ? { itinerary_id: selectedItineraryId } : {}) 
              }
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

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (locationDropdownRef.current && !locationDropdownRef.current.contains(event.target as Node)) {
        setShowLocationDropdown(false)
      }
      if (categoryDropdownRef.current && !categoryDropdownRef.current.contains(event.target as Node)) {
        setShowCategoryDropdown(false)
      }
      if (stageDropdownRef.current && !stageDropdownRef.current.contains(event.target as Node)) {
        setShowStageDropdown(false)
      }
    }

    if (showLocationDropdown || showCategoryDropdown || showStageDropdown) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showLocationDropdown, showCategoryDropdown, showStageDropdown])

  const handleDownloadCalendar = async (e?: React.MouseEvent) => {
    // Prevent any default behavior (form submission, navigation, etc.)
    if (e) {
      e.preventDefault()
      e.stopPropagation()
    }
    
    try {
      // Build URL with itinerary_id query parameter if an itinerary is selected
      let url = '/api/calendar/download'
      if (selectedItineraryId) {
        url += `?itinerary_id=${encodeURIComponent(selectedItineraryId)}`
      }

      console.log('Downloading calendar:', { url, selectedItineraryId })

      // Get the session token to pass as Authorization header
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      
      const headers: HeadersInit = {
        'Accept': 'text/calendar, application/octet-stream, */*',
      }
      
      // Add Authorization header with the access token if available
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`
      }

      const response = await fetch(url, {
        method: 'GET',
        credentials: 'include',
        headers,
      })
      
      if (!response.ok) {
        if (response.status === 401) {
          const errorData = await response.json().catch(() => ({}))
          console.error('Authentication error:', errorData)
          // Redirect to login with redirect parameter to return to calendar after sign-in
          router.push('/login?redirect=/app/calendar')
          return
        }
        const errorData = await response.json().catch(() => ({}))
        console.error('Download error:', response.status, errorData)
        throw new Error(errorData.error || 'Failed to download calendar')
      }

      // Check if response is actually a blob/ICS file
      const contentType = response.headers.get('content-type')
      if (!contentType || (!contentType.includes('calendar') && !contentType.includes('octet-stream'))) {
        // If we got HTML or JSON instead of ICS, something went wrong
        const text = await response.text()
        console.error('Unexpected response type:', contentType, text.substring(0, 200))
        throw new Error('Server returned unexpected content type')
      }

      // Get filename from Content-Disposition header, or use default
      const contentDisposition = response.headers.get('content-disposition')
      let filename = 'fibi-calendar.ics'
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="?([^"]+)"?/i)
        if (filenameMatch) {
          filename = filenameMatch[1]
        }
      }

      const blob = await response.blob()
      console.log('Calendar downloaded:', { filename, size: blob.size })
      
      if (blob.size === 0) {
        throw new Error('Downloaded file is empty')
      }

      const urlObj = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = urlObj
      a.download = filename
      a.style.display = 'none'
      document.body.appendChild(a)
      a.click()
      
      // Clean up after a short delay
      setTimeout(() => {
        window.URL.revokeObjectURL(urlObj)
        document.body.removeChild(a)
      }, 100)
    } catch (error: any) {
      console.error('Error downloading calendar:', error)
      alert(error.message || 'Failed to download calendar. Please try again.')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 md:py-6 pb-24 md:pb-8">
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
                    type="button"
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      handleShareItinerary()
                    }}
                    disabled={loadingShare}
                    className="p-2 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors relative group disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Share itinerary"
                  >
                    {loadingShare ? (
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                      </svg>
                    )}
                    <span className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 text-xs text-white bg-gray-900 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                      Share itinerary
                    </span>
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
                type="button"
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  handleDownloadCalendar(e)
                }}
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
            <button
              onClick={() => isMobile && setIsUnplannedExpanded(!isUnplannedExpanded)}
              className={`w-full flex items-center justify-between mb-4 ${isMobile ? 'cursor-pointer' : 'cursor-default'}`}
            >
              <div className="flex items-center gap-3">
                <h3 className="text-lg font-semibold text-gray-900">
                  Unplanned Places
                </h3>
                <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded-full">
                  {unplannedItems.length}
                </span>
              </div>
              
              <div className="flex items-center gap-2">
                {/* Mobile dropdown arrow */}
                {isMobile && (
                  <svg 
                    className={`w-5 h-5 text-gray-600 transition-transform ${isUnplannedExpanded ? 'rotate-180' : ''}`}
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                )}
                
                {/* View Mode Toggle - Hidden on mobile when collapsed */}
                {(!isMobile || isUnplannedExpanded) && (
                  <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setUnplannedViewMode('list')
                      }}
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
                      onClick={(e) => {
                        e.stopPropagation()
                        setUnplannedViewMode('grid')
                      }}
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
                )}
              </div>
            </button>

            {/* Filter Controls - Dropdown multiselects in a row - Hidden on mobile when collapsed */}
            {(!isMobile || isUnplannedExpanded) && (
            <div className="mb-4 flex items-center gap-3 flex-wrap">
              {/* Location Filter Dropdown */}
              {filterOptions.locations.length > 0 && (
                <div className="relative" ref={locationDropdownRef}>
                  <button
                    onClick={() => {
                      setShowLocationDropdown(!showLocationDropdown)
                      setShowCategoryDropdown(false)
                      setShowStageDropdown(false)
                    }}
                    className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <span>Location</span>
                    {unplannedLocationFilters.length > 0 && (
                      <span className="px-1.5 py-0.5 text-xs font-medium bg-gray-900 text-white rounded-full">
                        {unplannedLocationFilters.length}
                      </span>
                    )}
                    <svg 
                      className={`w-4 h-4 transition-transform ${showLocationDropdown ? 'rotate-180' : ''}`}
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  
                  {showLocationDropdown && (
                    <div className="absolute top-full left-0 mt-1 w-64 bg-white border border-gray-300 rounded-lg shadow-lg z-40">
                      <div className="p-2 border-b border-gray-200">
                        <input
                          type="text"
                          value={locationSearch}
                          onChange={(e) => setLocationSearch(e.target.value)}
                          placeholder="Search locations..."
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                          autoFocus
                        />
                      </div>
                      <div className="max-h-64 overflow-y-auto p-2">
                        <button
                          onClick={() => {
                            setUnplannedLocationFilters([])
                            setLocationSearch('')
                          }}
                          className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors ${
                            unplannedLocationFilters.length === 0
                              ? 'bg-gray-900 text-white'
                              : 'hover:bg-gray-100 text-gray-700'
                          }`}
                        >
                          All Locations
                        </button>
                        {filterOptions.locations
                          .filter((loc) => 
                            loc.toLowerCase().includes(locationSearch.toLowerCase())
                          )
                          .map((option) => {
                            const isSelected = unplannedLocationFilters.includes(option)
                            return (
                              <button
                                key={option}
                                onClick={() => {
                                  if (isSelected) {
                                    setUnplannedLocationFilters(unplannedLocationFilters.filter(v => v !== option))
                                  } else {
                                    setUnplannedLocationFilters([...unplannedLocationFilters, option])
                                  }
                                }}
                                className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors flex items-center gap-2 ${
                                  isSelected
                                    ? 'bg-gray-900 text-white'
                                    : 'hover:bg-gray-100 text-gray-700'
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
                    </div>
                  )}
                </div>
              )}

              {/* Category Filter Dropdown */}
              {filterOptions.categories.length > 0 && (
                <div className="relative" ref={categoryDropdownRef}>
                  <button
                    onClick={() => {
                      setShowCategoryDropdown(!showCategoryDropdown)
                      setShowLocationDropdown(false)
                      setShowStageDropdown(false)
                    }}
                    className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <span>Category</span>
                    {unplannedCategoryFilters.length > 0 && (
                      <span className="px-1.5 py-0.5 text-xs font-medium bg-gray-900 text-white rounded-full">
                        {unplannedCategoryFilters.length}
                      </span>
                    )}
                    <svg 
                      className={`w-4 h-4 transition-transform ${showCategoryDropdown ? 'rotate-180' : ''}`}
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  
                  {showCategoryDropdown && (
                    <div className="absolute top-full left-0 mt-1 w-64 bg-white border border-gray-300 rounded-lg shadow-lg z-40">
                      <div className="p-2 border-b border-gray-200">
                        <input
                          type="text"
                          value={categorySearch}
                          onChange={(e) => setCategorySearch(e.target.value)}
                          placeholder="Search categories..."
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                          autoFocus
                        />
                      </div>
                      <div className="max-h-64 overflow-y-auto p-2">
                        <button
                          onClick={() => {
                            setUnplannedCategoryFilters([])
                            setCategorySearch('')
                          }}
                          className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors ${
                            unplannedCategoryFilters.length === 0
                              ? 'bg-gray-900 text-white'
                              : 'hover:bg-gray-100 text-gray-700'
                          }`}
                        >
                          All Categories
                        </button>
                        {filterOptions.categories
                          .filter((cat) => 
                            cat.toLowerCase().includes(categorySearch.toLowerCase())
                          )
                          .map((option) => {
                            const isSelected = unplannedCategoryFilters.includes(option)
                            return (
                              <button
                                key={option}
                                onClick={() => {
                                  if (isSelected) {
                                    setUnplannedCategoryFilters(unplannedCategoryFilters.filter(v => v !== option))
                                  } else {
                                    setUnplannedCategoryFilters([...unplannedCategoryFilters, option])
                                  }
                                }}
                                className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors flex items-center gap-2 ${
                                  isSelected
                                    ? 'bg-gray-900 text-white'
                                    : 'hover:bg-gray-100 text-gray-700'
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
                    </div>
                  )}
                </div>
              )}

              {/* Stage Filter Dropdown */}
              {filterOptions.statuses.length > 0 && (
                <div className="relative" ref={stageDropdownRef}>
                  <button
                    onClick={() => {
                      setShowStageDropdown(!showStageDropdown)
                      setShowLocationDropdown(false)
                      setShowCategoryDropdown(false)
                    }}
                    className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <span>Stage</span>
                    {unplannedStatusFilters.length > 0 && (
                      <span className="px-1.5 py-0.5 text-xs font-medium bg-gray-900 text-white rounded-full">
                        {unplannedStatusFilters.length}
                      </span>
                    )}
                    <svg 
                      className={`w-4 h-4 transition-transform ${showStageDropdown ? 'rotate-180' : ''}`}
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  
                  {showStageDropdown && (
                    <div className="absolute top-full left-0 mt-1 w-64 bg-white border border-gray-300 rounded-lg shadow-lg z-40">
                      <div className="p-2 border-b border-gray-200">
                        <input
                          type="text"
                          value={stageSearch}
                          onChange={(e) => setStageSearch(e.target.value)}
                          placeholder="Search stages..."
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                          autoFocus
                        />
                      </div>
                      <div className="max-h-64 overflow-y-auto p-2">
                        <button
                          onClick={() => {
                            setUnplannedStatusFilters([])
                            setStageSearch('')
                          }}
                          className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors ${
                            unplannedStatusFilters.length === 0
                              ? 'bg-gray-900 text-white'
                              : 'hover:bg-gray-100 text-gray-700'
                          }`}
                        >
                          All Stages
                        </button>
                        {filterOptions.statuses
                          .filter((status) => 
                            status.toLowerCase().includes(stageSearch.toLowerCase())
                          )
                          .map((option) => {
                            const isSelected = unplannedStatusFilters.includes(option)
                            return (
                              <button
                                key={option}
                                onClick={() => {
                                  if (isSelected) {
                                    setUnplannedStatusFilters(unplannedStatusFilters.filter(v => v !== option))
                                  } else {
                                    setUnplannedStatusFilters([...unplannedStatusFilters, option])
                                  }
                                }}
                                className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors flex items-center gap-2 ${
                                  isSelected
                                    ? 'bg-gray-900 text-white'
                                    : 'hover:bg-gray-100 text-gray-700'
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
                    </div>
                  )}
                </div>
              )}

              {/* Selected Filters Display */}
              {(unplannedLocationFilters.length > 0 || unplannedCategoryFilters.length > 0 || unplannedStatusFilters.length > 0) && (
                <div className="flex items-center gap-2 flex-wrap">
                  {unplannedLocationFilters.map((loc) => (
                    <span
                      key={loc}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-gray-900 text-white rounded-md"
                    >
                      {loc}
                      <button
                        onClick={() => setUnplannedLocationFilters(unplannedLocationFilters.filter(l => l !== loc))}
                        className="hover:text-gray-300"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                  {unplannedCategoryFilters.map((cat) => (
                    <span
                      key={cat}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-gray-900 text-white rounded-md"
                    >
                      {cat}
                      <button
                        onClick={() => setUnplannedCategoryFilters(unplannedCategoryFilters.filter(c => c !== cat))}
                        className="hover:text-gray-300"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                  {unplannedStatusFilters.map((status) => (
                    <span
                      key={status}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-gray-900 text-white rounded-md"
                    >
                      {status}
                      <button
                        onClick={() => setUnplannedStatusFilters(unplannedStatusFilters.filter(s => s !== status))}
                        className="hover:text-gray-300"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                  <button
                    onClick={() => {
                      setUnplannedLocationFilters([])
                      setUnplannedCategoryFilters([])
                      setUnplannedStatusFilters([])
                    }}
                    className="text-xs font-medium text-gray-500 hover:text-gray-700 transition-colors"
                  >
                    Clear all
                  </button>
                </div>
              )}
            </div>
            )}
            
            {/* Unplanned Items Display - Hidden on mobile when collapsed */}
            {(!isMobile || isUnplannedExpanded) && (
              <>
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
                      {(unplannedLocationFilters.length === 0 && unplannedCategoryFilters.length === 0 && unplannedStatusFilters.length === 0)
                        ? 'No unplanned places. All places are scheduled!'
                        : 'No items match the selected filters'}
                    </p>
                  </div>
                )}
              </>
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
                setInviteEmail('')
                setInviteName('')
                setInviteError(null)
                setInviteSent(false)
              }
            }}
          >
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900">Share Itinerary</h2>
                <button
                  onClick={() => {
                    setShowShareModal(false)
                    setInviteEmail('')
                    setInviteName('')
                    setInviteError(null)
                    setInviteSent(false)
                  }}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
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
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                      onClick={(e) => {
                        const target = e.target as HTMLInputElement
                        target.select()
                      }}
                    />
                    <button
                      onClick={handleCopyLink}
                      className="px-4 py-2 bg-gray-900 text-white rounded-lg font-medium hover:bg-gray-800 transition-colors whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={!shareUrl}
                    >
                      {copied ? (
                        <span className="flex items-center gap-1">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          Copied!
                        </span>
                      ) : (
                        'Copy'
                      )}
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Anyone with this link can view your itinerary. They won&apos;t be able to edit it.
                  </p>
                </div>

                {/* Email Invite Section */}
                <div className="pt-4 border-t border-gray-200">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Send Invite via Email
                  </label>
                  <div className="space-y-3">
                    <input
                      type="email"
                      placeholder="friend@example.com"
                      value={inviteEmail}
                      onChange={(e) => {
                        setInviteEmail(e.target.value)
                        setInviteError(null)
                        setInviteSent(false)
                      }}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      disabled={sendingInvite || !shareUrl}
                    />
                    <input
                      type="text"
                      placeholder="Recipient name (optional)"
                      value={inviteName}
                      onChange={(e) => setInviteName(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      disabled={sendingInvite || !shareUrl}
                    />
                    <button
                      onClick={async () => {
                        if (!inviteEmail.trim() || !selectedItineraryId || !shareUrl) return

                        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
                        if (!emailRegex.test(inviteEmail.trim())) {
                          setInviteError('Please enter a valid email address')
                          return
                        }

                        setSendingInvite(true)
                        setInviteError(null)
                        setInviteSent(false)

                        try {
                          const selectedItinerary = itineraries.find((it) => it.id === selectedItineraryId)
                          const response = await fetch('/api/itinerary/invite', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              itinerary_id: selectedItineraryId,
                              recipientEmail: inviteEmail.trim(),
                              recipientName: inviteName.trim() || undefined,
                              itineraryName: selectedItinerary?.name,
                            }),
                          })

                          const data = await response.json()

                          if (!response.ok) {
                            throw new Error(data.error || 'Failed to send invite')
                          }

                          setInviteSent(true)
                          setInviteEmail('')
                          setInviteName('')
                        } catch (error: any) {
                          console.error('Error sending invite:', error)
                          setInviteError(error.message || 'Failed to send invite. Please try again.')
                        } finally {
                          setSendingInvite(false)
                        }
                      }}
                      className="w-full px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-500 text-white rounded-lg font-medium hover:from-blue-700 hover:to-cyan-600 transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      disabled={sendingInvite || !shareUrl || !inviteEmail.trim()}
                    >
                      {sendingInvite ? (
                        <>
                          <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                          Sending...
                        </>
                      ) : inviteSent ? (
                        <>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          Invite Sent!
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                          Send Invite
                        </>
                      )}
                    </button>
                    {inviteError && (
                      <p className="text-xs text-red-600 mt-1">{inviteError}</p>
                    )}
                    {inviteSent && (
                      <p className="text-xs text-green-600 mt-1">Invite email sent successfully! 🎉</p>
                    )}
                  </div>
                </div>
                
                {/* Native Share Button for Mobile */}
                {typeof navigator !== 'undefined' && navigator.share && shareUrl && (
                  <button
                    onClick={async () => {
                      try {
                        await navigator.share({
                          title: 'Shared Itinerary',
                          text: 'Check out this travel itinerary',
                          url: shareUrl,
                        })
                      } catch (error: any) {
                        // User cancelled or error occurred
                        if (error.name !== 'AbortError') {
                          console.error('Error sharing:', error)
                        }
                      }
                    }}
                    className="w-full px-4 py-2 bg-gray-900 text-white rounded-lg font-medium hover:bg-gray-800 transition-colors flex items-center justify-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                    </svg>
                    Share via...
                  </button>
                )}
                
                <div className="flex gap-3 pt-2 border-t border-gray-200">
                  <button
                    onClick={handleRevokeShare}
                    className="flex-1 px-4 py-2 border border-red-300 text-red-700 rounded-lg font-medium hover:bg-red-50 transition-colors"
                  >
                    Revoke Link
                  </button>
                  <button
                    onClick={() => {
                      setShowShareModal(false)
                      setInviteEmail('')
                      setInviteName('')
                      setInviteError(null)
                      setInviteSent(false)
                    }}
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
              platform={item.platform}
              hideLabel={true}
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
              platform={item.platform}
              hideLabel={true}
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
            platform={item.platform}
            hideLabel={true}
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
              platform={item.platform}
              hideLabel={true}
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
          {item.screenshot_url ? (
            <div className="aspect-video w-full overflow-hidden bg-gray-100">
              <img
                src={item.screenshot_url}
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
            platform={item.platform}
            hideLabel={true}
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

