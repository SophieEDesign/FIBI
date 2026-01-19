'use client'

import { useEffect, useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { SavedItem, CATEGORIES, STATUSES } from '@/types/database'
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
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    if (user) {
      loadItems()
      loadUserCustomOptions()
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
                <Link
                  key={item.id}
                  href={`/item/${item.id}`}
                  className="bg-white rounded-xl md:rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow flex flex-col"
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
    </div>
  )
}
