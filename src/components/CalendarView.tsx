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
import { getHostname } from '@/lib/utils'
import Link from 'next/link'
import MobileMenu from '@/components/MobileMenu'
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
  const [loading, setLoading] = useState(true)
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [activeId, setActiveId] = useState<string | null>(null)
  const [draggedItem, setDraggedItem] = useState<SavedItem | null>(null)
  const supabase = createClient()
  const router = useRouter()

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 200,
        tolerance: 5,
      },
    })
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

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    setActiveId(null)
    setDraggedItem(null)

    if (!over) return

    const itemId = active.id as string
    const targetDate = over.id as string

    // If dropped on "unplanned" area, set planned_date to null
    if (targetDate === 'unplanned') {
      try {
        const { error } = await supabase
          .from('saved_items')
          .update({ planned_date: null })
          .eq('id', itemId)

        if (error) throw error

        // Optimistic update
        setItems((prev) =>
          prev.map((item) =>
            item.id === itemId ? { ...item, planned_date: null } : item
          )
        )
      } catch (error) {
        console.error('Error removing planned date:', error)
        loadItems() // Reload on error
      }
      return
    }

    // Parse date from target (format: "date-YYYY-MM-DD")
    if (typeof targetDate === 'string' && targetDate.startsWith('date-')) {
      const dateStr = targetDate.replace('date-', '')

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
              <UnplannedDropZone>
                {unplannedItems.map((item) => (
                  <PlaceCard key={item.id} item={item} isDragging={activeId === item.id} />
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
              Drag places onto the calendar
            </h3>
            <p className="text-sm text-gray-600 max-w-md mx-auto">
              Drag any place from the unplanned section above onto a date to plan it. You can
              move places between dates or remove them by dragging back to unplanned.
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

// Place Card Component (draggable)
interface PlaceCardProps {
  item: SavedItem
  isDragging: boolean
  compact?: boolean
  overlay?: boolean
}

function PlaceCard({ item, isDragging, compact = false, overlay = false }: PlaceCardProps) {
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

  if (overlay) {
    // Drag overlay - larger, more visible
    return (
      <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-2 w-48 opacity-90">
        {imageUrl && (
          <div className="aspect-video rounded mb-2 overflow-hidden bg-gray-100">
            <img
              src={imageUrl}
              alt={displayTitle}
              className="w-full h-full object-cover"
            />
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
        {...listeners}
        {...attributes}
        className={`bg-white rounded border border-gray-200 p-1.5 cursor-move hover:shadow-sm transition-shadow ${
          isDragging ? 'opacity-50' : ''
        }`}
      >
        {imageUrl ? (
          <div className="aspect-video rounded mb-1 overflow-hidden bg-gray-100">
            <img
              src={imageUrl}
              alt={displayTitle}
              className="w-full h-full object-cover"
            />
          </div>
        ) : (
          <div className="aspect-video rounded mb-1 bg-gray-100 flex items-center justify-center">
            <span className="text-xs text-gray-400">📌</span>
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
      {...listeners}
      {...attributes}
      className={`bg-white rounded-lg border border-gray-200 p-2 w-32 md:w-40 cursor-move hover:shadow-md transition-shadow ${
        isDragging ? 'opacity-50' : ''
      }`}
    >
      {imageUrl ? (
        <div className="aspect-video rounded mb-2 overflow-hidden bg-gray-100">
          <img
            src={imageUrl}
            alt={displayTitle}
            className="w-full h-full object-cover"
          />
        </div>
      ) : (
        <div className="aspect-video rounded mb-2 bg-gray-100 flex items-center justify-center">
          <span className="text-lg text-gray-400">📌</span>
        </div>
      )}
      <p className="text-xs md:text-sm font-medium text-gray-900 line-clamp-2">
        {displayTitle}
      </p>
    </div>
  )
}

