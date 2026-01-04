'use client'

import { useEffect, useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { SavedItem } from '@/types/database'
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
import MobileMenu from '@/components/MobileMenu'
import { useRouter } from 'next/navigation'
import EmbedPreview from '@/components/EmbedPreview'

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
  const [loading, setLoading] = useState(true)
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [activeId, setActiveId] = useState<string | null>(null)
  const [draggedItem, setDraggedItem] = useState<SavedItem | null>(null)
  const [selectedItem, setSelectedItem] = useState<SavedItem | null>(null)
  const [isMobile, setIsMobile] = useState(false)
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [itemToDate, setItemToDate] = useState<SavedItem | null>(null)
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

  // Only enable drag sensors on desktop
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    // Disable TouchSensor on mobile - we'll use tap instead
  )

  useEffect(() => {
    if (user) {
      loadItems()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  const loadItems = async () => {
    if (!user) return

    try {
      // Load items with planned_date (for calendar view)
      // For now, we load all items regardless of itinerary_id (supporting future multi-itinerary)
      // When multiple itineraries are implemented, we'll filter by selected itinerary_id
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

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

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

      const dayItems = items.filter((item) => {
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
  }, [currentMonth, items])

  // Get unplanned items (items without planned_date)
  const unplannedItems = useMemo(() => {
    return items.filter((item) => !item.planned_date)
  }, [items])

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event
    setActiveId(active.id as string)
    const item = items.find((i) => i.id === active.id)
    setDraggedItem(item || null)
  }

  // Assign date to item (used for both drag-and-drop and tap-based selection)
  const assignDateToItem = async (itemId: string, dateStr: string | null) => {
    try {
      const { error } = await supabase
        .from('saved_items')
        .update({ planned_date: dateStr })
        .eq('id', itemId)

      if (error) throw error

      // Optimistic update
      setItems((prev) =>
        prev.map((item) =>
          item.id === itemId ? { ...item, planned_date: dateStr } : item
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
      const response = await fetch('/api/calendar/download')
      
      if (!response.ok) {
        if (response.status === 401) {
          alert('Please sign in to download your calendar')
          return
        }
        throw new Error('Failed to download calendar')
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
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 md:py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-xl md:text-2xl font-bold text-gray-900">Planner</h1>

            {/* Mobile: Menu */}
            <div className="md:hidden flex items-center gap-2">
              <Link
                href="/app"
                className="text-gray-600 hover:text-gray-900 text-sm font-medium"
              >
                Back
              </Link>
              <MobileMenu isAuthenticated={!!user} onSignOut={handleSignOut} />
            </div>

            {/* Desktop buttons */}
            <div className="hidden md:flex items-center gap-4">
              <Link
                href="/app"
                className="text-gray-600 hover:text-gray-900 text-sm font-medium"
              >
                Home
              </Link>
              <Link
                href="/app/map"
                className="text-gray-600 hover:text-gray-900 text-sm font-medium"
              >
                Map
              </Link>
              <Link
                href="/app/add"
                className="bg-gray-900 text-white px-4 py-2 rounded-lg font-medium hover:bg-gray-800 transition-colors"
              >
                Add Place
              </Link>
              <Link
                href="/profile"
                className="text-gray-600 hover:text-gray-900 text-sm font-medium"
              >
                Profile
              </Link>
              <button
                onClick={handleSignOut}
                className="text-gray-600 hover:text-gray-900 text-sm font-medium"
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8 pb-24 md:pb-8">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          enabled={!isMobile} // Disable drag-and-drop on mobile
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

          {/* Unplanned Items Section */}
          {unplannedItems.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-medium text-gray-700 mb-3">
                Unplanned ({unplannedItems.length})
              </h3>
              <UnplannedDropZone>
                {unplannedItems.map((item) => (
                  <PlaceCard
                    key={item.id}
                    item={item}
                    isDragging={activeId === item.id}
                    onSelect={() => setSelectedItem(item)}
                    onAssignDate={isMobile ? () => handleItemTapForDate(item) : undefined}
                    isMobile={isMobile}
                  />
                ))}
              </UnplannedDropZone>
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
              {isMobile ? 'Tap places to plan them' : 'Drag places onto the calendar'}
            </h3>
            <p className="text-sm text-gray-600 max-w-md mx-auto">
              {isMobile
                ? 'Tap any place from the unplanned section above to assign it to a date. You can move places between dates or remove them from the calendar.'
                : 'Drag any place from the unplanned section above onto a date to plan it. You can move places between dates or remove them by dragging back to unplanned.'}
            </p>
          </div>
        )}
      </main>
    </div>
  )
}

// Unplanned Drop Zone Component
function UnplannedDropZone({ children }: { children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({
    id: 'unplanned',
  })

  return (
    <div
      ref={setNodeRef}
      className={`min-h-[100px] p-4 bg-white rounded-xl border-2 border-dashed flex flex-wrap gap-3 transition-colors ${
        isOver ? 'border-blue-400 bg-blue-50' : 'border-gray-300'
      }`}
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
    disabled: isMobile, // Disable dragging on mobile
  })

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
      }
    : undefined

  const displayTitle = item.title || getHostname(item.url)
  const imageUrl = item.screenshot_url || item.thumbnail_url

  // Handle click/tap
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    
    // On mobile, show date picker; on desktop, show preview
    if (isMobile && onAssignDate) {
      onAssignDate()
    } else if (!isDragging && onSelect) {
      onSelect()
    }
  }

  if (overlay) {
    // Drag overlay - larger, more visible
    return (
      <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-2 w-48 opacity-90">
        {item.screenshot_url ? (
          <div className="aspect-video rounded mb-2 overflow-hidden bg-gray-100">
            <img
              src={item.screenshot_url}
              alt={displayTitle}
              className="w-full h-full object-cover"
            />
          </div>
        ) : (
          <div className="aspect-video rounded mb-2 overflow-hidden bg-gray-100 relative">
            <EmbedPreview
              url={item.url}
              thumbnailUrl={item.thumbnail_url}
              platform={item.platform}
              displayTitle={displayTitle}
            />
            <div className="absolute inset-0 w-full h-full flex items-center justify-center bg-gray-50">
              <span className="text-lg text-gray-400">
                {item.platform === 'TikTok' ? '🎵' : item.platform === 'Instagram' ? '📷' : item.platform === 'YouTube' ? '▶️' : '📌'}
              </span>
            </div>
          </div>
        )}
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
        {...(!isMobile ? { ...listeners, ...attributes } : {})} // Only enable drag listeners on desktop
        onClick={handleClick}
        className={`bg-white rounded border border-gray-200 p-1.5 cursor-pointer hover:shadow-sm transition-shadow ${
          isDragging ? 'opacity-50' : ''
        }`}
      >
        {item.screenshot_url ? (
          <div className="aspect-video rounded mb-1 overflow-hidden bg-gray-100">
            <img
              src={item.screenshot_url}
              alt={displayTitle}
              className="w-full h-full object-cover"
            />
          </div>
        ) : (
          <div className="aspect-video rounded mb-1 overflow-hidden bg-gray-100 relative">
            <EmbedPreview
              url={item.url}
              thumbnailUrl={item.thumbnail_url}
              platform={item.platform}
              displayTitle={displayTitle}
            />
            <div className="absolute inset-0 w-full h-full flex items-center justify-center bg-gray-50">
              <span className="text-xs text-gray-400">
                {item.platform === 'TikTok' ? '🎵' : item.platform === 'Instagram' ? '📷' : item.platform === 'YouTube' ? '▶️' : '📌'}
              </span>
            </div>
          </div>
        )}
        <p className="text-xs font-medium text-gray-900 line-clamp-1">{displayTitle}</p>
      </div>
    )
  }

  // Full version for unplanned section
  return (
    <div
      ref={setNodeRef}
      style={style}
      {...(!isMobile ? { ...listeners, ...attributes } : {})} // Only enable drag listeners on desktop
      onClick={handleClick}
      className={`bg-white rounded-lg border border-gray-200 p-2 w-32 md:w-40 cursor-pointer hover:shadow-md transition-shadow ${
        isDragging ? 'opacity-50' : ''
      }`}
    >
      {item.screenshot_url ? (
        <div className="aspect-video rounded mb-2 overflow-hidden bg-gray-100">
          <img
            src={item.screenshot_url}
            alt={displayTitle}
            className="w-full h-full object-cover"
          />
        </div>
      ) : (
        <div className="aspect-video rounded mb-2 overflow-hidden bg-gray-100 relative">
          <EmbedPreview
            url={item.url}
            thumbnailUrl={item.thumbnail_url}
            platform={item.platform}
            displayTitle={displayTitle}
          />
          <div className="absolute inset-0 w-full h-full flex items-center justify-center bg-gray-50">
            <span className="text-lg text-gray-400">
              {item.platform === 'TikTok' ? '🎵' : item.platform === 'Instagram' ? '📷' : item.platform === 'YouTube' ? '▶️' : '📌'}
            </span>
          </div>
        </div>
      )}
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
              <EmbedPreview
                url={item.url}
                thumbnailUrl={item.thumbnail_url}
                platform={item.platform}
                displayTitle={displayTitle}
              />
              <div className="absolute inset-0 w-full h-full flex items-center justify-center bg-gray-50">
                <span className="text-4xl text-gray-400">
                  {item.platform === 'TikTok' ? '🎵' : item.platform === 'Instagram' ? '📷' : item.platform === 'YouTube' ? '▶️' : '📌'}
                </span>
              </div>
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

