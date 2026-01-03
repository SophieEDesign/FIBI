'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { SavedItem, CATEGORIES, STATUSES } from '@/types/database'
import { getHostname } from '@/lib/utils'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import MobileMenu from '@/components/MobileMenu'

interface HomeGridProps {
  user: any
  confirmed?: boolean
}

export default function HomeGrid({ user, confirmed }: HomeGridProps) {
  const [items, setItems] = useState<SavedItem[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [selectedStatus, setSelectedStatus] = useState<string>('all')
  const [showConfirmedMessage, setShowConfirmedMessage] = useState(confirmed || false)
  const [showInstructions, setShowInstructions] = useState(false)
  const [showFilterModal, setShowFilterModal] = useState(false)
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    if (user) {
      loadItems()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  // Listen for auth state changes (e.g., after login)
  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
        // Reload items when auth state changes
        if (session?.user) {
          loadItems()
        }
      }
    })

    return () => {
      subscription.unsubscribe()
    }
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

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const filteredItems = items.filter((item) => {
    if (selectedCategory !== 'all' && item.category !== selectedCategory) return false
    if (selectedStatus !== 'all' && item.status !== selectedStatus) return false
    return true
  })

  const activeFiltersCount = (selectedCategory !== 'all' ? 1 : 0) + (selectedStatus !== 'all' ? 1 : 0)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header - Mobile-first */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 md:py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-xl md:text-2xl font-bold text-gray-900">FiBi</h1>
            
            {/* Mobile: Add button in header */}
            <div className="md:hidden flex items-center gap-2">
              {filteredItems.length > 0 && (
                <button
                  onClick={() => setShowFilterModal(true)}
                  className="relative px-3 py-1.5 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
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
                className="bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors"
              >
                Add
              </Link>
            </div>

            {/* Desktop buttons */}
            <div className="hidden md:flex items-center gap-4">
              <Link
                href="/app/map"
                className="text-gray-600 hover:text-gray-900 text-sm font-medium"
              >
                Map
              </Link>
              <span className="text-gray-400 text-sm font-medium cursor-not-allowed">
                Planner <span className="text-xs">(coming soon)</span>
              </span>
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
        {/* Email confirmation success message */}
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

        {/* Instructions - collapsed by default on mobile */}
        {filteredItems.length > 0 && (
          <div className="mb-6">
            <button
              onClick={() => setShowInstructions(!showInstructions)}
              className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
            >
              <svg 
                className={`w-4 h-4 transition-transform ${showInstructions ? 'rotate-180' : ''}`} 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
              {showInstructions ? 'Hide instructions' : 'How to use Fibi'}
            </button>
            {showInstructions && (
              <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4 md:p-6">
                <h3 className="text-sm font-semibold text-gray-900 mb-4">Quick guide</h3>
                <div className="space-y-3 text-sm text-gray-700">
                  <div className="flex items-start gap-3">
                    <span className="font-medium text-gray-900">1.</span>
                    <p><strong>Install Fibi</strong> as an app to your device for one-tap sharing</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="font-medium text-gray-900">2.</span>
                    <p>Find a place on TikTok, Instagram, or any website and <strong>share the link to Fibi</strong></p>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="font-medium text-gray-900">3.</span>
                    <p>Fibi automatically fetches the title and preview image, or you can add your own screenshot</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="font-medium text-gray-900">4.</span>
                    <p>Add location, category, and status to organise your saved places</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="font-medium text-gray-900">5.</span>
                    <p>Click any card to view details, edit, or open the original link</p>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-blue-200">
                  <p className="text-xs text-gray-600">
                    <strong>Tip:</strong> Install Fibi as a PWA to share links directly from your phone&apos;s share menu.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Filters - Desktop: inline, Mobile: hidden (shown in modal) */}
        {filteredItems.length > 0 && (
          <div className="mb-6 md:mb-8 hidden md:block">
            <div className="flex flex-wrap gap-2 items-center">
              <span className="text-sm font-medium text-gray-700 mr-2">Category:</span>
              <button
                onClick={() => setSelectedCategory('all')}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  selectedCategory === 'all'
                    ? 'bg-gray-900 text-white'
                    : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                }`}
              >
                All
              </button>
              {CATEGORIES.map((category) => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                    selectedCategory === category
                      ? 'bg-gray-900 text-white'
                      : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap gap-2 items-center mt-3">
              <span className="text-sm font-medium text-gray-700 mr-2">Status:</span>
              <button
                onClick={() => setSelectedStatus('all')}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  selectedStatus === 'all'
                    ? 'bg-gray-900 text-white'
                    : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                }`}
              >
                All
              </button>
              {STATUSES.map((status) => (
                <button
                  key={status}
                  onClick={() => setSelectedStatus(status)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                    selectedStatus === status
                      ? 'bg-gray-900 text-white'
                      : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Empty state */}
        {!loading && filteredItems.length === 0 && (
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-8 md:mb-12">
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3">
                Save places you don&apos;t want to forget
              </h2>
              <p className="text-base md:text-lg text-gray-600">
                From TikTok, Instagram, and the web — all in one calm place.
              </p>
            </div>

            <div className="bg-white rounded-2xl border border-gray-200 p-6 md:p-8 mb-6 md:mb-8">
              <h3 className="text-base md:text-lg font-semibold text-gray-900 mb-4 md:mb-6 text-center">
                How it works
              </h3>
              <div className="space-y-4 md:space-y-6 max-w-2xl mx-auto">
                <div className="flex items-start gap-3 md:gap-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-900 text-white flex items-center justify-center text-sm font-medium">
                    1
                  </div>
                  <div className="flex-1 pt-1">
                    <p className="text-gray-900 font-medium">Share a link to Fibi</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 md:gap-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-900 text-white flex items-center justify-center text-sm font-medium">
                    2
                  </div>
                  <div className="flex-1 pt-1">
                    <p className="text-gray-900 font-medium">Add a screenshot or note so you remember why</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 md:gap-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-900 text-white flex items-center justify-center text-sm font-medium">
                    3
                  </div>
                  <div className="flex-1 pt-1">
                    <p className="text-gray-900 font-medium">Find it again later by location or category</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="text-center mb-6 md:mb-8">
              <p className="text-sm text-gray-600">
                Some apps don&apos;t share previews — a screenshot keeps the context.
              </p>
            </div>

            <div className="text-center">
              <Link
                href="/app/add"
                className="inline-block bg-gray-900 text-white px-8 py-3 rounded-lg font-medium hover:bg-gray-800 transition-colors mb-2"
              >
                Add your first place
              </Link>
              <p className="text-sm text-gray-500">
                Or share a link from another app
              </p>
            </div>
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

        {/* Grid - Mobile: single column, Desktop: grid */}
        {!loading && filteredItems.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
            {filteredItems.map((item) => {
              const previewImageUrl = item.screenshot_url || item.thumbnail_url || null
              const hasImage = !!previewImageUrl
              const isUserScreenshot = !!item.screenshot_url
              const displayTitle = item.title || getHostname(item.url)
              
              const getPlatformBadgeStyle = (platform: string) => {
                switch (platform) {
                  case 'TikTok':
                    return 'bg-black text-white'
                  case 'Instagram':
                    return 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
                  case 'YouTube':
                    return 'bg-red-600 text-white'
                  default:
                    return 'bg-gray-700 text-white'
                }
              }

              const getStatusStyle = (status: string | null) => {
                if (!status) return 'bg-gray-100 text-gray-700'
                switch (status) {
                  case 'Want':
                    return 'bg-blue-100 text-blue-700'
                  case 'Dream':
                    return 'bg-purple-100 text-purple-700'
                  case 'Maybe':
                    return 'bg-yellow-100 text-yellow-700'
                  case 'Been':
                    return 'bg-green-100 text-green-700'
                  default:
                    return 'bg-gray-100 text-gray-700'
                }
              }

              return (
                <Link
                  key={item.id}
                  href={`/item/${item.id}`}
                  className="bg-white rounded-xl md:rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-200 flex flex-col"
                >
                  {/* Thumbnail area - Mobile: reduced height */}
                  <div className="aspect-[4/3] md:aspect-[4/3] bg-gray-50 relative overflow-hidden">
                    {hasImage ? (
                      <>
                        <img
                          src={previewImageUrl}
                          alt={displayTitle}
                          className="w-full h-full object-cover"
                          loading="lazy"
                          referrerPolicy={isUserScreenshot ? undefined : "no-referrer"}
                          onError={(e) => {
                            const target = e.target as HTMLImageElement
                            target.style.display = 'none'
                            const placeholder = target.nextElementSibling as HTMLElement
                            if (placeholder) placeholder.style.display = 'flex'
                          }}
                        />
                        <div className="hidden w-full h-full items-center justify-center bg-gray-50">
                          <div className="text-center px-4">
                            <div className="text-gray-400 text-2xl md:text-3xl mb-2">
                              {item.platform === 'TikTok' ? '🎵' : item.platform === 'Instagram' ? '📷' : item.platform === 'YouTube' ? '▶️' : '🔗'}
                            </div>
                            <p className="text-xs text-gray-500">Preview unavailable</p>
                            <p className="text-xs text-gray-400 mt-1">Add a screenshot to remember this place</p>
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gray-50">
                        <div className="text-center px-4">
                          <div className="text-gray-400 text-2xl md:text-3xl mb-2">
                            {item.platform === 'TikTok' ? '🎵' : item.platform === 'Instagram' ? '📷' : item.platform === 'YouTube' ? '▶️' : '🔗'}
                          </div>
                          <p className="text-xs text-gray-500">Preview unavailable</p>
                          <p className="text-xs text-gray-400 mt-1">Add a screenshot to remember this place</p>
                        </div>
                      </div>
                    )}
                    
                    {/* Platform badge - inside card, bottom left on mobile */}
                    <div className={`absolute bottom-2 left-2 md:top-2 md:right-2 md:bottom-auto md:left-auto px-2 py-1 rounded text-xs font-medium ${getPlatformBadgeStyle(item.platform)}`}>
                      {item.platform}
                    </div>
                    
                    {/* User screenshot indicator */}
                    {isUserScreenshot && (
                      <div className="absolute top-2 left-2 px-1.5 py-0.5 bg-black/70 text-white text-xs rounded">
                        Your screenshot
                      </div>
                    )}
                  </div>

                  {/* Content area */}
                  <div className="p-3 md:p-4 flex-1 flex flex-col">
                    <h3 className="font-medium text-gray-900 mb-1 line-clamp-2 flex-shrink-0 text-sm md:text-base">
                      {displayTitle}
                    </h3>
                    {(item.location_city || item.location_country) && (
                      <p className="text-xs md:text-sm text-gray-600 mb-2 flex-shrink-0">
                        {[item.location_city, item.location_country].filter(Boolean).join(', ')}
                      </p>
                    )}
                    {/* Status pill */}
                    {item.status && (
                      <div className="mt-auto pt-2">
                        <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium ${getStatusStyle(item.status)}`}>
                          {item.status}
                        </span>
                      </div>
                    )}
                  </div>
                </Link>
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
              {/* Category Filter */}
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-3">Category</h3>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setSelectedCategory('all')}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                      selectedCategory === 'all'
                        ? 'bg-gray-900 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    All
                  </button>
                  {CATEGORIES.map((category) => (
                    <button
                      key={category}
                      onClick={() => setSelectedCategory(category)}
                      className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                        selectedCategory === category
                          ? 'bg-gray-900 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {category}
                    </button>
                  ))}
                </div>
              </div>

              {/* Status Filter */}
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-3">Status</h3>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setSelectedStatus('all')}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                      selectedStatus === 'all'
                        ? 'bg-gray-900 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    All
                  </button>
                  {STATUSES.map((status) => (
                    <button
                      key={status}
                      onClick={() => setSelectedStatus(status)}
                      className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                        selectedStatus === status
                          ? 'bg-gray-900 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {status}
                    </button>
                  ))}
                </div>
              </div>

              {/* Apply Button */}
              <div className="pt-4 border-t border-gray-200">
                <button
                  onClick={() => setShowFilterModal(false)}
                  className="w-full bg-gray-900 text-white py-3 rounded-lg font-medium hover:bg-gray-800 transition-colors"
                >
                  Apply filters
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
