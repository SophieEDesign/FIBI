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
import PlaceDetailDrawer from '@/components/PlaceDetailDrawer'
import { useRouter, useSearchParams } from 'next/navigation'

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
  const [showCreateItineraryModal, setShowCreateItineraryModal] = useState(false)
  const [newItineraryName, setNewItineraryName] = useState('')
  const [creatingItinerary, setCreatingItinerary] = useState(false)
  const [showShareModal, setShowShareModal] = useState(false)
  const [shareStep, setShareStep] = useState<'choose' | 'link'>('choose')
  const [shareType, setShareType] = useState<'copy' | 'collaborate'>('copy')
  const [shareCollaborators, setShareCollaborators] = useState<{ user_id: string | null; invited_email: string | null; full_name: string | null }[]>([])
  const [shareUrl, setShareUrl] = useState<string | null>(null)
  const [shareToken, setShareToken] = useState<string | null>(null)
  const [loadingShare, setLoadingShare] = useState(false)
  const [copied, setCopied] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteName, setInviteName] = useState('')
  const [sendingInvite, setSendingInvite] = useState(false)
  const [inviteSent, setInviteSent] = useState(false)
  const [inviteError, setInviteError] = useState<string | null>(null)
  const [showRemoveItineraryModal, setShowRemoveItineraryModal] = useState(false)
  const [removingItinerary, setRemovingItinerary] = useState(false)
  const [tripNotesOpen, setTripNotesOpen] = useState(false)
  const [tripNotesValue, setTripNotesValue] = useState('')
  const [savingTripNotes, setSavingTripNotes] = useState(false)
  const [editingTripDates, setEditingTripDates] = useState(false)
  const [editTripStart, setEditTripStart] = useState('')
  const [editTripEnd, setEditTripEnd] = useState('')
  const [savingTripDates, setSavingTripDates] = useState(false)
  const [uploadingCover, setUploadingCover] = useState(false)
  const coverInputRef = useRef<HTMLInputElement>(null)
  const [itineraryComments, setItineraryComments] = useState<{ id: string; user_id: string; body: string; created_at: string; author_name: string }[]>([])
  const [commentsOpen, setCommentsOpen] = useState(false)
  const [newCommentBody, setNewCommentBody] = useState('')
  const [postingComment, setPostingComment] = useState(false)
  const [unplannedLocationFilters, setUnplannedLocationFilters] = useState<string[]>([])
  const [unplannedCategoryFilters, setUnplannedCategoryFilters] = useState<string[]>([])
  const [unplannedViewMode, setUnplannedViewMode] = useState<'grid' | 'list'>('grid')
  const [showLocationDropdown, setShowLocationDropdown] = useState(false)
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false)
  const [isUnplannedExpanded, setIsUnplannedExpanded] = useState(false) // Mobile dropdown state
  const [locationSearch, setLocationSearch] = useState('')
  const [categorySearch, setCategorySearch] = useState('')
  const locationDropdownRef = useRef<HTMLDivElement>(null)
  const categoryDropdownRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()
  const router = useRouter()
  const searchParams = useSearchParams()

  // Preselect itinerary from URL (e.g. after "Add to my account" -> "View in my account")
  useEffect(() => {
    const id = searchParams.get('itinerary_id')
    if (id && itineraries.some((i) => i.id === id)) {
      setSelectedItineraryId(id)
      router.replace('/app/calendar')
    }
  }, [searchParams, itineraries, router])

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

  const loadComments = async (itineraryId: string) => {
    if (!user) return
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const headers: HeadersInit = {}
      if (session?.access_token) headers['Authorization'] = `Bearer ${session.access_token}`
      const res = await fetch(`/api/itinerary/${itineraryId}/comments`, { credentials: 'include', headers })
      if (res.ok) {
        const data = await res.json()
        setItineraryComments(data)
      } else {
        setItineraryComments([])
      }
    } catch {
      setItineraryComments([])
    }
  }

  const postComment = async () => {
    if (!selectedItineraryId || !newCommentBody.trim() || !user) return
    setPostingComment(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const headers: HeadersInit = { 'Content-Type': 'application/json' }
      if (session?.access_token) headers['Authorization'] = `Bearer ${session.access_token}`
      const res = await fetch(`/api/itinerary/${selectedItineraryId}/comments`, {
        method: 'POST',
        credentials: 'include',
        headers,
        body: JSON.stringify({ body: newCommentBody.trim() }),
      })
      if (res.ok) {
        setNewCommentBody('')
        await loadComments(selectedItineraryId)
      }
    } catch (err) {
      console.error('Failed to post comment:', err)
    } finally {
      setPostingComment(false)
    }
  }

  const loadShareCollaborators = async (itineraryId: string) => {
    if (!user) return
    try {
      const { data: rows, error } = await supabase
        .from('itinerary_collaborators')
        .select('user_id, invited_email')
        .eq('itinerary_id', itineraryId)

      if (error || !rows?.length) {
        setShareCollaborators([])
        return
      }
      const userIds = rows.map((r) => r.user_id).filter(Boolean) as string[]
      if (userIds.length === 0) {
        setShareCollaborators(rows.map((r) => ({ ...r, full_name: null })))
        return
      }
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', userIds)
      const nameByUserId = new Map((profiles || []).map((p) => [p.id, p.full_name]))
      setShareCollaborators(
        rows.map((r) => ({
          user_id: r.user_id,
          invited_email: r.invited_email,
          full_name: r.user_id ? (nameByUserId.get(r.user_id) ?? null) : null,
        }))
      )
    } catch (err) {
      console.error('Error loading collaborators:', err)
      setShareCollaborators([])
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
    setShareStep('choose')
    setShareUrl(null)
    setShareToken(null)
    setShareType('copy')
    setInviteError(null)
    setInviteSent(false)
    setShowShareModal(true)
  }

  const handleShareContinue = async () => {
    if (!selectedItineraryId) return
    setLoadingShare(true)
    setCopied(false)
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      if (sessionError || !session) {
        throw new Error('You must be logged in to share itineraries')
      }
      const headers: HeadersInit = { 'Content-Type': 'application/json' }
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`
      }
      const response = await fetch('/api/itinerary/share', {
        method: 'POST',
        credentials: 'include',
        headers,
        body: JSON.stringify({ itinerary_id: selectedItineraryId, share_type: shareType }),
      })
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Failed to generate share link')
      }
      const data = await response.json()
      if (!data.share_url || !data.share_token) {
        throw new Error('Invalid response from server')
      }
      setShareUrl(data.share_url)
      setShareToken(data.share_token)
      setShareStep('link')
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

  const saveTripDates = async () => {
    if (!user || !selectedItineraryId) return
    setSavingTripDates(true)
    try {
      const { error } = await supabase
        .from('itineraries')
        .update({
          start_date: editTripStart || null,
          end_date: editTripEnd || null,
        })
        .eq('id', selectedItineraryId)
        .eq('user_id', user.id)
      if (error) throw error
      setItineraries((prev) =>
        prev.map((t) =>
          t.id === selectedItineraryId
            ? { ...t, start_date: editTripStart || null, end_date: editTripEnd || null }
            : t
        )
      )
      setEditingTripDates(false)
    } catch (err) {
      console.error('Error saving trip dates:', err)
    } finally {
      setSavingTripDates(false)
    }
  }

  const saveTripNotes = async (notes: string) => {
    if (!user || !selectedItineraryId) return
    setSavingTripNotes(true)
    try {
      const { error } = await supabase
        .from('itineraries')
        .update({ notes: notes || null })
        .eq('id', selectedItineraryId)
        .eq('user_id', user.id)
      if (error) throw error
      setItineraries((prev) =>
        prev.map((t) =>
          t.id === selectedItineraryId ? { ...t, notes: notes || null } : t
        )
      )
    } catch (err) {
      console.error('Error saving trip notes:', err)
    } finally {
      setSavingTripNotes(false)
    }
  }

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !user || !selectedItineraryId) return
    setUploadingCover(true)
    try {
      const ext = file.name.split('.').pop() || 'jpg'
      const path = `${user.id}/trip-covers/${selectedItineraryId}.${ext}`
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('screenshots')
        .upload(path, file, { upsert: true })
      if (uploadError) throw uploadError
      const { data: urlData } = supabase.storage.from('screenshots').getPublicUrl(uploadData.path)
      const coverUrl = urlData.publicUrl
      const { error: updateError } = await supabase
        .from('itineraries')
        .update({ cover_image_url: coverUrl })
        .eq('id', selectedItineraryId)
        .eq('user_id', user.id)
      if (updateError) throw updateError
      setItineraries((prev) =>
        prev.map((t) =>
          t.id === selectedItineraryId ? { ...t, cover_image_url: coverUrl } : t
        )
      )
    } catch (err) {
      console.error('Error uploading cover:', err)
      alert('Failed to upload cover image.')
    } finally {
      setUploadingCover(false)
      e.target.value = ''
    }
  }

  const handleRemoveItinerary = async () => {
    if (!user || !selectedItineraryId) return
    setRemovingItinerary(true)
    try {
      const { error } = await supabase
        .from('itineraries')
        .delete()
        .eq('id', selectedItineraryId)
        .eq('user_id', user.id)

      if (error) throw error
      setSelectedItineraryId(null)
      setShowRemoveItineraryModal(false)
      await loadItineraries()
      await loadItems()
    } catch (error) {
      console.error('Error removing itinerary:', error)
      alert('Failed to remove trip. Please try again.')
    } finally {
      setRemovingItinerary(false)
    }
  }

  // Load collaborators when share modal is on link step and share type is collaborate
  useEffect(() => {
    if (showShareModal && shareStep === 'link' && selectedItineraryId && shareType === 'collaborate') {
      loadShareCollaborators(selectedItineraryId)
    } else {
      setShareCollaborators([])
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showShareModal, shareStep, selectedItineraryId, shareType])

  // Load comments when an itinerary is selected
  useEffect(() => {
    if (selectedItineraryId && user) {
      loadComments(selectedItineraryId)
    } else {
      setItineraryComments([])
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedItineraryId, user])

  // Sync trip notes value when itinerary changes
  useEffect(() => {
    if (selectedItineraryId) {
      const trip = itineraries.find((t) => t.id === selectedItineraryId)
      setTripNotesValue(trip?.notes ?? '')
    } else {
      setTripNotesValue('')
    }
  }, [selectedItineraryId, itineraries])

  // Load existing share when itinerary is selected (only when share modal is closed so we don't overwrite the choose step)
  useEffect(() => {
    if (!selectedItineraryId || selectedItineraryId === null || showShareModal) {
      if (!selectedItineraryId) {
        setShareUrl(null)
        setShareToken(null)
      }
      return
    }

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
  }, [selectedItineraryId, showShareModal])

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

  // Trip places in display order (trip_position ASC NULLS LAST, then created_at)
  const tripPlacesOrdered = useMemo(() => {
    if (!selectedItineraryId) return []
    return [...filteredItems].sort((a, b) => {
      const posA = a.trip_position ?? 999999
      const posB = b.trip_position ?? 999999
      if (posA !== posB) return posA - posB
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    })
  }, [selectedItineraryId, filteredItems])

  // Generate calendar days for current month (kept for reference but not rendered in new UI)
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
    
    return unplanned
  }, [items, unplannedLocationFilters, unplannedCategoryFilters])

  // Extract unique filter values from ALL unplanned items (not just current itinerary)
  const filterOptions = useMemo(() => {
    const locations = new Set<string>()
    const categories = new Set<string>()
    
    items
      .filter((item) => !item.planned_date)
      .forEach((item) => {
        if (item.location_city) locations.add(item.location_city)
        if (item.location_country) locations.add(item.location_country)
        if (item.place_name) locations.add(item.place_name)
        
        if (item.category) {
          try {
            const cats = JSON.parse(item.category)
            const catArray = Array.isArray(cats) ? cats : [cats]
            catArray.forEach((cat: string) => categories.add(cat))
          } catch {
            categories.add(item.category)
          }
        }
      })
    
    return {
      locations: Array.from(locations).sort(),
      categories: Array.from(categories).sort(),
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
        trip_position?: number | null
        status?: string | null
      } = {
        planned_date: dateStr,
        status: newStatuses.length > 0 ? JSON.stringify(newStatuses) : null,
      }

      if (selectedItineraryId && dateStr) {
        updateData.itinerary_id = selectedItineraryId
        const inTrip = filteredItems.filter((i) => i.itinerary_id === selectedItineraryId && i.id !== itemId)
        updateData.trip_position = inTrip.length
      } else if (!dateStr) {
        updateData.itinerary_id = null
        updateData.trip_position = null
      }

      const { error } = await supabase
        .from('saved_items')
        .update(updateData)
        .eq('id', itemId)

      if (error) throw error

      // Optimistic update
      setItems((prev) =>
        prev.map((it) =>
          it.id === itemId
            ? {
                ...it,
                planned_date: dateStr,
                status: updateData.status || null,
                itinerary_id: updateData.itinerary_id ?? it.itinerary_id,
                trip_position: updateData.trip_position ?? it.trip_position,
              }
            : it
        )
      )
    } catch (error) {
      console.error('Error updating planned date:', error)
      loadItems() // Reload on error
    }
  }

  // Reorder trip places: update trip_position for affected items
  const reorderTripPlaces = async (itemId: string, newIndex: number) => {
    if (!selectedItineraryId || newIndex < 0) return
    const ordered = tripPlacesOrdered
    const oldIndex = ordered.findIndex((i) => i.id === itemId)
    if (oldIndex === -1 || oldIndex === newIndex) return

    const reordered = [...ordered]
    const [removed] = reordered.splice(oldIndex, 1)
    reordered.splice(newIndex, 0, removed)

    // Optimistic update
    setItems((prev) =>
      prev.map((it) => {
        const pos = reordered.findIndex((r) => r.id === it.id)
        if (pos === -1) return it
        return { ...it, trip_position: pos }
      })
    )

    try {
      for (let i = 0; i < reordered.length; i++) {
        await supabase
          .from('saved_items')
          .update({ trip_position: i })
          .eq('id', reordered[i].id)
      }
    } catch (err) {
      console.error('Error reordering trip places:', err)
      loadItems()
    }
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    setActiveId(null)
    setDraggedItem(null)

    if (!over) return

    const itemId = active.id as string
    const overId = over.id as string

    // Trip moodboard: reorder by dropping on another place or on the moodboard drop zone
    if (selectedItineraryId) {
      if (overId === 'moodboard') {
        // Dropped on the board (end of list)
        await reorderTripPlaces(itemId, tripPlacesOrdered.length - 1)
        return
      }
      const newIndex = tripPlacesOrdered.findIndex((i) => i.id === overId)
      if (newIndex !== -1) {
        await reorderTripPlaces(itemId, newIndex)
      }
      return
    }

    // Legacy: date assignment (kept for any remaining flows; can be removed if unused)
    if (overId === 'unplanned') {
      await assignDateToItem(itemId, null)
      return
    }
    if (typeof overId === 'string' && overId.startsWith('date-')) {
      const dateStr = overId.replace('date-', '')
      await assignDateToItem(itemId, dateStr)
    }
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
    }

    if (showLocationDropdown || showCategoryDropdown) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showLocationDropdown, showCategoryDropdown])

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

      // Handle 204 No Content (no items to download)
      if (response.status === 204) {
        alert('No items with planned dates found to download.')
        return
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

  const hasPlacesNoTrips = !loading && items.length > 0 && itineraries.length === 0

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-12 pb-24 md:pb-12">
        {/* Empty state: user has places but no trips */}
        {hasPlacesNoTrips && (
          <div className="max-w-xl mx-auto text-center py-14 md:py-20">
            <h2 className="text-2xl md:text-3xl font-medium text-[#1f2937] mb-3 leading-tight">
              Start shaping your next trip.
            </h2>
            <p className="text-base text-[#6b7280] mb-8 leading-relaxed">
              Group your saved places into a trip. You can add dates later.
            </p>
            <button
              type="button"
              onClick={() => setShowCreateItineraryModal(true)}
              className="inline-block bg-[#1f2937] text-white px-8 py-3 rounded-xl font-medium hover:opacity-90 shadow-[0_2px_8px_rgba(0,0,0,0.06),0_1px_2px_rgba(0,0,0,0.04)] transition-opacity"
            >
              Create your first trip
            </button>
          </div>
        )}

        {/* Trip tabs - only when we have trips or no places */}
        {!hasPlacesNoTrips && (
        <div className="mb-6 md:mb-8">
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">
            <button
              onClick={() => setSelectedItineraryId(null)}
              className={`px-4 py-2 rounded-2xl text-sm font-medium whitespace-nowrap transition-all ${
                selectedItineraryId === null
                  ? 'bg-[#1f2937] text-white shadow-soft'
                  : 'bg-white text-[#6b7280] shadow-soft hover:text-[#1f2937]'
              }`}
            >
              All
            </button>
            {itineraries.map((itinerary) => (
              <div key={itinerary.id} className="flex items-center gap-1">
                <button
                  onClick={() => setSelectedItineraryId(itinerary.id)}
                  className={`px-4 py-2 rounded-2xl text-sm font-medium whitespace-nowrap transition-all ${
                    selectedItineraryId === itinerary.id
                      ? 'bg-[#1f2937] text-white shadow-soft'
                      : 'bg-white text-[#6b7280] shadow-soft hover:text-[#1f2937]'
                  }`}
                >
                  {itinerary.name}
                </button>
                {selectedItineraryId === itinerary.id && (
                  <>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        handleShareItinerary()
                      }}
                      disabled={loadingShare}
                      className="p-2 rounded-xl text-[#6b7280] hover:bg-gray-100 transition-colors relative group disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Share trip"
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
                        Share trip
                      </span>
                    </button>
                    {itinerary.user_id === user?.id && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          setShowRemoveItineraryModal(true)
                        }}
                        className="p-2 rounded-xl text-[#6b7280] hover:bg-red-50 hover:text-red-600 transition-colors relative group"
                        title="Remove trip"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        <span className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 text-xs text-white bg-gray-900 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                          Remove trip
                        </span>
                      </button>
                    )}
                  </>
                )}
              </div>
            ))}
            <button
              onClick={() => setShowCreateItineraryModal(true)}
              className="px-4 py-2 rounded-2xl text-sm font-medium whitespace-nowrap bg-white text-[#6b7280] shadow-soft hover:text-[#1f2937] transition-colors flex items-center gap-1"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              New
            </button>
          </div>
        </div>
        )}

        {!hasPlacesNoTrips && (
        <>
        {/* Drag and drop context - works on both desktop and mobile */}
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
            {/* Trip view: moodboard when a trip is selected, or all places when "All" */}
          {selectedItineraryId ? (
            <>
              {/* Trip cover hero: wide hero with soft gradient overlay and trip name */}
              {(() => {
                const trip = itineraries.find((t) => t.id === selectedItineraryId)
                if (!trip) return null
                const coverUrl =
                  trip.cover_image_url ||
                  (tripPlacesOrdered[0]?.screenshot_url || tripPlacesOrdered[0]?.thumbnail_url) ||
                  null
                return (
                  <div className="relative -mx-4 sm:-mx-6 md:-mx-8 lg:-mx-12 mb-6 overflow-hidden rounded-2xl">
                    <div className="relative aspect-[21/6] min-h-[120px] md:min-h-[130px] bg-gray-100">
                      {coverUrl ? (
                        <img
                          src={coverUrl}
                          alt=""
                          className="absolute inset-0 w-full h-full object-cover"
                        />
                      ) : (
                        <div className="absolute inset-0 bg-gradient-to-br from-gray-200 to-gray-300" />
                      )}
                      <div
                        className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent"
                        aria-hidden
                      />
                      <div className="absolute bottom-0 left-0 right-0 p-4 md:p-6 flex items-end justify-between gap-4">
                        <h2 className="text-xl md:text-2xl font-semibold text-white drop-shadow-sm">
                          {trip.name}
                        </h2>
                        {trip.user_id === user?.id && (
                          <>
                            <input
                              ref={coverInputRef}
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={handleCoverUpload}
                            />
                            <button
                              type="button"
                              onClick={() => coverInputRef.current?.click()}
                              disabled={uploadingCover}
                              className="p-2 rounded-xl bg-white/20 hover:bg-white/30 text-white backdrop-blur-sm transition-colors disabled:opacity-50"
                              title="Change cover"
                              aria-label="Change cover"
                            >
                              {uploadingCover ? (
                                <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                </svg>
                              ) : (
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                              )}
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })()}

              {/* Date range pill - minimal, subtle, directly below hero */}
              {selectedItineraryId && (() => {
                const trip = itineraries.find((t) => t.id === selectedItineraryId)
                if (!trip) return null
                const canEditDates = trip.user_id === user?.id
                if (editingTripDates && canEditDates) {
                  return (
                    <div className="mb-4 flex items-center gap-2 flex-wrap">
                      <input
                        type="date"
                        value={editTripStart}
                        onChange={(e) => setEditTripStart(e.target.value)}
                        className="px-3 py-1.5 text-sm border border-gray-200 rounded-full bg-white/80 focus:outline-none focus:ring-2 focus:ring-gray-900/20 focus:border-gray-400"
                      />
                      <span className="text-gray-400 text-sm">–</span>
                      <input
                        type="date"
                        value={editTripEnd}
                        onChange={(e) => setEditTripEnd(e.target.value)}
                        className="px-3 py-1.5 text-sm border border-gray-200 rounded-full bg-white/80 focus:outline-none focus:ring-2 focus:ring-gray-900/20 focus:border-gray-400"
                      />
                      <button
                        type="button"
                        onClick={saveTripDates}
                        disabled={savingTripDates}
                        className="px-3 py-1.5 text-sm font-medium text-gray-700 hover:text-gray-900"
                      >
                        {savingTripDates ? 'Saving…' : 'Save'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingTripDates(false)
                          setEditTripStart(trip.start_date || '')
                          setEditTripEnd(trip.end_date || '')
                        }}
                        className="px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700"
                      >
                        Cancel
                      </button>
                    </div>
                  )
                }
                const hasDates = trip.start_date || trip.end_date
                if (!hasDates && !canEditDates) return null
                return (
                  <div className="mb-4">
                    {hasDates ? (
                      <button
                        type="button"
                        onClick={() => canEditDates && (setEditingTripDates(true), setEditTripStart(trip.start_date || ''), setEditTripEnd(trip.end_date || ''))}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 rounded-full border border-gray-200 bg-white/60 ${canEditDates ? 'hover:bg-gray-50 cursor-pointer' : 'cursor-default'}`}
                      >
                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        {trip.start_date && new Date(trip.start_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                        {trip.start_date && trip.end_date && ' – '}
                        {trip.end_date && new Date(trip.end_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => { setEditingTripDates(true); setEditTripStart(''); setEditTripEnd('') }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-500 rounded-full border border-dashed border-gray-200 hover:border-gray-300 hover:bg-gray-50/80 transition-colors"
                      >
                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        Add dates
                      </button>
                    )}
                  </div>
                )
              })()}

              {/* Trip Notes and Comments - side-by-side on desktop, stacked on mobile, collapsed if empty */}
              {selectedItineraryId && (() => {
                const trip = itineraries.find((t) => t.id === selectedItineraryId)
                const canEditNotes = trip?.user_id === user?.id
                const hasNotes = !!(trip?.notes && trip.notes.trim())
                const showTripNotes = canEditNotes || hasNotes
                return (
                <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                  {showTripNotes ? (
                      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                        <button
                          onClick={() => setTripNotesOpen(!tripNotesOpen)}
                          className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors text-left"
                        >
                          <h3 className="text-sm font-semibold text-gray-900">Trip notes</h3>
                          <svg
                            className={`w-5 h-5 text-gray-500 transition-transform ${tripNotesOpen ? 'rotate-180' : ''}`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                        {tripNotesOpen && (
                          <div className="border-t border-gray-200 p-4">
                            <textarea
                              value={tripNotesValue}
                              onChange={(e) => setTripNotesValue(e.target.value)}
                              onBlur={() => saveTripNotes(tripNotesValue)}
                              placeholder="Add notes about this trip..."
                              rows={3}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent resize-none"
                            />
                            {savingTripNotes && <p className="text-xs text-gray-500 mt-2">Saving…</p>}
                          </div>
                        )}
                      </div>
                    ) : null}
                  <div className={`bg-white rounded-xl border border-gray-200 overflow-hidden ${!showTripNotes ? 'md:col-span-2' : ''}`}>
                    <button
                      onClick={() => setCommentsOpen(!commentsOpen)}
                      className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors text-left"
                    >
                      <h3 className="text-sm font-semibold text-gray-900">Comments</h3>
                      {itineraryComments.length > 0 && (
                        <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                          {itineraryComments.length}
                        </span>
                      )}
                      <svg
                        className={`w-5 h-5 text-gray-500 transition-transform ${commentsOpen ? 'rotate-180' : ''}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    {commentsOpen && (
                      <div className="border-t border-gray-200 p-4 space-y-3">
                        <div className="space-y-2 max-h-40 overflow-y-auto">
                          {itineraryComments.length === 0 ? (
                            <p className="text-sm text-gray-500">No comments yet.</p>
                          ) : (
                            itineraryComments.map((c) => (
                              <div key={c.id} className="text-sm">
                                <span className="font-medium text-gray-900">{c.author_name}</span>
                                <span className="text-gray-500 text-xs ml-2">
                                  {new Date(c.created_at).toLocaleString()}
                                </span>
                                <p className="text-gray-700 mt-0.5">{c.body}</p>
                              </div>
                            ))
                          )}
                        </div>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={newCommentBody}
                            onChange={(e) => setNewCommentBody(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && postComment()}
                            placeholder="Add a comment..."
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                          />
                          <button
                            type="button"
                            onClick={postComment}
                            disabled={postingComment || !newCommentBody.trim()}
                            className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {postingComment ? 'Sending…' : 'Send'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                )
              })()}

              {/* Moodboard - primary visual focus with clean spacing */}
              {tripPlacesOrdered.length === 0 && (
                <div className="max-w-xl mx-auto text-center py-14 md:py-20">
                  <h2 className="text-2xl md:text-3xl font-medium text-[#1f2937] mb-3 leading-tight">
                    Start shaping this trip.
                  </h2>
                  <p className="text-base text-[#6b7280] mb-8 leading-relaxed">
                    Add places to build your board.
                  </p>
                  <Link
                    href={selectedItineraryId ? `/app/add?itinerary_id=${selectedItineraryId}` : '/app/add'}
                    className="inline-block bg-[#1f2937] text-white px-8 py-3 rounded-xl font-medium hover:opacity-90 shadow-[0_2px_8px_rgba(0,0,0,0.06),0_1px_2px_rgba(0,0,0,0.04)] transition-opacity"
                  >
                    Add a place
                  </Link>
                </div>
              )}

              {tripPlacesOrdered.length > 0 && (
                <div className="mt-8">
                <MoodboardGrid
                  items={tripPlacesOrdered}
                  activeId={activeId}
                  draggedItem={draggedItem}
                  onSelect={(item) => setSelectedItem(item)}
                  isMobile={isMobile}
                />
                </div>
              )}
            </>
          ) : (
            /* All: simple grid of all places */
            <div className="mb-6">
              {filteredItems.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No places yet. Add places or select a trip.</p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {filteredItems.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setSelectedItem(item)}
                      className="text-left bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2"
                    >
                      <div className="aspect-[4/3] bg-gray-100">
                        {item.screenshot_url || item.thumbnail_url ? (
                          <img
                            src={item.screenshot_url || item.thumbnail_url || ''}
                            alt={item.title || item.place_name || 'Place'}
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
                      </div>
                      <div className="p-3">
                        <p className="text-sm font-medium text-gray-900 line-clamp-2">{item.title || item.place_name || getHostname(item.url)}</p>
                        <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{item.location_city || item.location_country || item.formatted_address || '—'}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Download (when a trip is selected) */}
          {selectedItineraryId && tripPlacesOrdered.length > 0 && (
            <div className="mb-4">
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  handleDownloadCalendar(e)
                }}
                className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                title="Download trip"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                <span className="hidden sm:inline">Download</span>
              </button>
            </div>
          )}

          {/* REMOVED: Unplanned section and calendar grid - replaced by trip moodboard / all grid above */}
          {false && (
            <>
            <div className="mb-4 flex items-center gap-3 flex-wrap">
              {/* Location Filter Dropdown */}
              {filterOptions.locations.length > 0 && (
                <div className="relative" ref={locationDropdownRef}>
                  <button
                    onClick={() => {
                      setShowLocationDropdown(!showLocationDropdown)
                      setShowCategoryDropdown(false)
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

              {/* Selected Filters Display */}
              {(unplannedLocationFilters.length > 0 || unplannedCategoryFilters.length > 0) && (
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
                  <button
                    onClick={() => {
                      setUnplannedLocationFilters([])
                      setUnplannedCategoryFilters([])
                    }}
                    className="text-xs font-medium text-gray-500 hover:text-gray-700 transition-colors"
                  >
                    Clear all
                  </button>
                </div>
              )}
            </div>
            
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
                            onAssignDate={undefined}
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
                          onAssignDate={undefined}
                          isMobile={isMobile}
                        />
                      ))
                    )}
                  </UnplannedDropZone>
                ) : (
                  <div className="p-8 border-2 border-dashed border-gray-300 rounded-lg text-center">
                    <p className="text-sm text-gray-600">
                      {(unplannedLocationFilters.length === 0 && unplannedCategoryFilters.length === 0)
                        ? 'No unplanned places. All places are scheduled!'
                        : 'No items match the selected filters'}
                    </p>
                  </div>
                )}
              </>
            )}
          </>
        )}

          {/* Drag Overlay - matches MoodboardCard styling */}
          <DragOverlay>
            {draggedItem ? (
              <div className="bg-white rounded-[16px] border border-gray-200 overflow-hidden shadow-[0_4px_20px_rgba(0,0,0,0.12),0_2px_8px_rgba(0,0,0,0.08)] w-48 opacity-95 cursor-grabbing">
                <div className="aspect-[4/3] bg-gray-100">
                  {draggedItem.screenshot_url || draggedItem.thumbnail_url ? (
                    <img
                      src={draggedItem.screenshot_url || draggedItem.thumbnail_url || ''}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <LinkPreview
                      url={draggedItem.url}
                      ogImage={draggedItem.thumbnail_url}
                      screenshotUrl={draggedItem.screenshot_url}
                      description={draggedItem.description}
                      platform={draggedItem.platform}
                      hideLabel
                    />
                  )}
                </div>
                <div className="p-3">
                  <p className="text-sm font-medium text-gray-900 line-clamp-2">
                    {draggedItem.title || draggedItem.place_name || getHostname(draggedItem.url)}
                  </p>
                  {(draggedItem.location_city || draggedItem.location_country || draggedItem.formatted_address) && (
                    <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">
                      {draggedItem.location_city || draggedItem.location_country || draggedItem.formatted_address}
                    </p>
                  )}
                </div>
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
        </>
        )}

        {/* Place Detail Drawer */}
        {selectedItem && (
          <PlaceDetailDrawer
            item={selectedItem}
            onClose={() => setSelectedItem(null)}
            onItemUpdate={(updated) => {
              setItems((prev) => prev.map((i) => (i.id === updated.id ? updated : i)))
            }}
            isMobile={isMobile}
          />
        )}

        {/* Create trip modal */}
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
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Create trip</h2>
              <div className="space-y-4">
                <div>
                  <label htmlFor="trip-name" className="block text-sm font-medium text-gray-700 mb-2">
                    Trip name
                  </label>
                  <input
                    id="trip-name"
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

        {/* Share trip modal */}
        {showShareModal && (
          <div
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setShowShareModal(false)
                setShareStep('choose')
                setInviteEmail('')
                setInviteName('')
                setInviteError(null)
                setInviteSent(false)
              }
            }}
          >
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900">Share trip</h2>
                <button
                  onClick={() => {
                    setShowShareModal(false)
                    setShareStep('choose')
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
                {shareStep === 'choose' ? (
                  <>
                    <p className="text-sm text-gray-700 mb-3">How do you want to share?</p>
                    <div className="space-y-2">
                      <label className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 has-[:checked]:border-gray-900 has-[:checked]:bg-gray-50">
                        <input
                          type="radio"
                          name="shareType"
                          checked={shareType === 'collaborate'}
                          onChange={() => setShareType('collaborate')}
                          className="mt-1 text-gray-900 focus:ring-gray-900"
                        />
                        <div>
                          <span className="font-medium text-gray-900">Collaborate</span>
                          <p className="text-xs text-gray-600 mt-0.5">Work on the same trip together. They&apos;ll see it in their Trips and you&apos;ll see who it&apos;s shared with.</p>
                        </div>
                      </label>
                      <label className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 has-[:checked]:border-gray-900 has-[:checked]:bg-gray-50">
                        <input
                          type="radio"
                          name="shareType"
                          checked={shareType === 'copy'}
                          onChange={() => setShareType('copy')}
                          className="mt-1 text-gray-900 focus:ring-gray-900"
                        />
                        <div>
                          <span className="font-medium text-gray-900">Send a copy</span>
                          <p className="text-xs text-gray-600 mt-0.5">They get their own copy and can add it to their account from the link.</p>
                        </div>
                      </label>
                    </div>
                    <button
                      onClick={handleShareContinue}
                      disabled={loadingShare}
                      className="w-full px-4 py-2 bg-gray-900 text-white rounded-lg font-medium hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {loadingShare ? (
                        <>
                          <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                          Generating link...
                        </>
                      ) : (
                        'Continue'
                      )}
                    </button>
                  </>
                ) : (
                  <>
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
                  <p className="text-xs text-gray-600 mt-2">
                    {shareType === 'collaborate'
                      ? 'Share this link so others can join as collaborators. They\'ll see the trip in their Trips and can edit it.'
                      : 'Anyone with this link can view your trip. They can add a copy to their account.'}
                  </p>
                  {shareType === 'collaborate' && shareCollaborators.length > 0 && (
                    <p className="text-xs text-gray-600 mt-2">
                      Shared with: {shareCollaborators.map((c) => c.full_name || c.invited_email || 'Unknown').join(', ')}
                    </p>
                  )}
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
                          const { data: { session } } = await supabase.auth.getSession()
                          const headers: HeadersInit = { 'Content-Type': 'application/json' }
                          if (session?.access_token) {
                            headers['Authorization'] = `Bearer ${session.access_token}`
                          }
                          const response = await fetch('/api/itinerary/invite', {
                            method: 'POST',
                            credentials: 'include',
                            headers,
                            body: JSON.stringify({
                              itinerary_id: selectedItineraryId,
                              recipientEmail: inviteEmail.trim(),
                              recipientName: inviteName.trim() || undefined,
                              itineraryName: selectedItinerary?.name,
                              share_type: shareType,
                            }),
                          })

                          const data = await response.json()

                          if (!response.ok) {
                            throw new Error(data.error || 'Failed to send invite')
                          }

                          setInviteSent(true)
                          setInviteEmail('')
                          setInviteName('')
                          if (shareType === 'collaborate' && selectedItineraryId) {
                            loadShareCollaborators(selectedItineraryId)
                          }
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
title: 'Shared trip',
          text: 'Check out this trip',
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
                      setShareStep('choose')
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
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Remove trip modal */}
        {showRemoveItineraryModal && selectedItineraryId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
            <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Remove trip?</h3>
              <p className="text-sm text-gray-600 mb-6">
                Remove &quot;{itineraries.find((i) => i.id === selectedItineraryId)?.name ?? 'this trip'}&quot;? Places in it will be removed from this trip.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowRemoveItineraryModal(false)}
                  disabled={removingItinerary}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleRemoveItinerary}
                  disabled={removingItinerary}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {removingItinerary ? 'Removing…' : 'Remove'}
                </button>
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

      </main>
    </div>
  )
}

// Moodboard: masonry grid with draggable cards (title + location only, 16px radius)
interface MoodboardGridProps {
  items: SavedItem[]
  activeId: string | null
  draggedItem: SavedItem | null
  onSelect: (item: SavedItem) => void
  isMobile: boolean
}

function MoodboardGrid({ items, activeId, draggedItem, onSelect, isMobile }: MoodboardGridProps) {
  const { setNodeRef, isOver } = useDroppable({ id: 'moodboard' })

  return (
    <div
      ref={setNodeRef}
      className={`min-h-[200px] rounded-2xl p-4 transition-colors ${isOver ? 'bg-gray-100' : ''}`}
      style={{ columnCount: isMobile ? 2 : 4, columnGap: '1rem' }}
    >
      {items.map((item) => (
        <MoodboardCardWrapper key={item.id} item={item}>
          <MoodboardCard
            item={item}
            isDragging={activeId === item.id}
            onSelect={() => onSelect(item)}
            isMobile={isMobile}
          />
        </MoodboardCardWrapper>
      ))}
    </div>
  )
}

function MoodboardCardWrapper({ item, children }: { item: SavedItem; children: React.ReactNode }) {
  const { setNodeRef } = useDroppable({ id: item.id })
  return (
    <div ref={setNodeRef} className="break-inside-avoid mb-4">
      {children}
    </div>
  )
}

interface MoodboardCardProps {
  item: SavedItem
  isDragging: boolean
  onSelect: () => void
  isMobile: boolean
}

function MoodboardCard({ item, isDragging, onSelect, isMobile }: MoodboardCardProps) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({ id: item.id })
  const style = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : undefined
  const title = item.title || item.place_name || getHostname(item.url)
  const location = item.location_city || item.location_country || item.formatted_address || null

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      onClick={(e) => { e.stopPropagation(); onSelect() }}
      className={`bg-white rounded-[16px] border border-gray-200 overflow-hidden shadow-[0_2px_12px_rgba(0,0,0,0.06),0_1px_3px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.08),0_2px_4px_rgba(0,0,0,0.06)] transition-shadow cursor-pointer ${isDragging ? 'opacity-50' : ''}`}
    >
      <div className="aspect-[4/3] bg-gray-100">
        {item.screenshot_url || item.thumbnail_url ? (
          <img
            src={item.screenshot_url || item.thumbnail_url || ''}
            alt={title}
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
      </div>
      <div className="p-3">
        <p className="text-sm font-medium text-gray-900 line-clamp-2">{title}</p>
        {location && <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{location}</p>}
      </div>
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
  const statuses = parseStatuses(item.status ?? null)

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