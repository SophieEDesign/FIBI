'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { SavedItem, CATEGORIES, STATUSES } from '@/types/database'
import { getHostname } from '@/lib/utils'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import MobileMenu from '@/components/MobileMenu'

interface HomeGridProps {
  confirmed?: boolean
}

export default function HomeGrid({ confirmed }: HomeGridProps = {}) {
  const [items, setItems] = useState<SavedItem[]>([])
  const [loading, setLoading] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(true) // Assume authenticated since server already checked
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [selectedStatus, setSelectedStatus] = useState<string>('all')
  const [showConfirmedMessage, setShowConfirmedMessage] = useState(confirmed || false)
  const [showInstructions, setShowInstructions] = useState(false)
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    loadItems()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Listen for auth state changes (e.g., after login)
  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
        // Reload items when auth state changes
        loadItems()
      }
    })

    return () => {
      subscription.unsubscribe()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const loadItems = async () => {
    try {
      // Server already verified auth, so we can skip the check and load items directly
      // This reduces flashing and improves UX
      const { data, error } = await supabase
        .from('saved_items')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error loading items:', error)
        // If it's an auth error, redirect to login
        if (error.message.includes('JWT') || error.message.includes('auth')) {
          router.push('/login')
          return
        }
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

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between relative">
            <h1 className="text-2xl font-bold text-gray-900">FiBi</h1>
            {/* Desktop buttons */}
            <div className="hidden md:flex items-center gap-4">
              {isAuthenticated ? (
                <>
                  <Link
                    href="/map"
                    className="text-gray-600 hover:text-gray-900 text-sm font-medium"
                  >
                    Map
                  </Link>
                  <Link
                    href="/add"
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
                </>
              ) : (
                <Link
                  href="/login"
                  className="bg-gray-900 text-white px-4 py-2 rounded-lg font-medium hover:bg-gray-800 transition-colors"
                >
                  Sign in
                </Link>
              )}
            </div>
            {/* Mobile menu */}
            <MobileMenu
              isAuthenticated={isAuthenticated === true}
              onSignOut={handleSignOut}
            />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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

        {/* Instructions - collapsible */}
        {isAuthenticated && filteredItems.length > 0 && (
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
              <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-6">
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

        {/* Filters - only show when there are items */}
        {filteredItems.length > 0 && (
          <div className="mb-8">
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

        {/* Empty state - only show when authenticated and no items (and not loading) */}
        {!loading && isAuthenticated && filteredItems.length === 0 && (
          <div className="max-w-3xl mx-auto">
            {/* Intro section */}
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-gray-900 mb-3">
                Save places you don&apos;t want to forget
              </h2>
              <p className="text-lg text-gray-600">
                From TikTok, Instagram, and the web — all in one calm place.
              </p>
            </div>

            {/* How it works */}
            <div className="bg-white rounded-2xl border border-gray-200 p-8 mb-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-6 text-center">
                How it works
              </h3>
              <div className="space-y-6 max-w-2xl mx-auto">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-900 text-white flex items-center justify-center text-sm font-medium">
                    1
                  </div>
                  <div className="flex-1 pt-1">
                    <p className="text-gray-900 font-medium">Share a link to Fibi</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-900 text-white flex items-center justify-center text-sm font-medium">
                    2
                  </div>
                  <div className="flex-1 pt-1">
                    <p className="text-gray-900 font-medium">Add a screenshot or note so you remember why</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-900 text-white flex items-center justify-center text-sm font-medium">
                    3
                  </div>
                  <div className="flex-1 pt-1">
                    <p className="text-gray-900 font-medium">Find it again later by location or category</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Reassurance */}
            <div className="text-center mb-8">
              <p className="text-sm text-gray-600">
                Some apps don&apos;t share previews — a screenshot keeps the context.
              </p>
            </div>

            {/* Primary action */}
            <div className="text-center">
              <Link
                href="/add"
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

        {/* Not authenticated empty state */}
        {isAuthenticated === false && (
          <div className="max-w-2xl mx-auto py-16 px-4">
            <div className="bg-white rounded-2xl border border-gray-200 p-8 md:p-12 text-center">
              <div className="mb-6">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Save places before you lose them</h2>
                <p className="text-gray-600 mb-8">
                  Install Fibi first, then share links from TikTok, Instagram, or any website.
                </p>
              </div>

              <Link
                href="/login"
                className="inline-block bg-gray-900 text-white px-6 py-3 rounded-lg font-medium hover:bg-gray-800 transition-colors mb-4"
              >
                Sign in to get started
              </Link>
              <p className="text-sm text-gray-500">
                Tip: Installing Fibi makes sharing one tap faster.
              </p>
            </div>
          </div>
        )}

        {/* Loading state - show skeleton while loading */}
        {loading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
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

        {/* Grid - only show when there are items */}
        {!loading && filteredItems.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredItems.map((item) => {
              // Preview priority: screenshot_url > thumbnail_url > placeholder
              const previewImageUrl = item.screenshot_url || item.thumbnail_url || null
              const hasImage = !!previewImageUrl
              const isUserScreenshot = !!item.screenshot_url
              const displayTitle = item.title || getHostname(item.url)
              
              // Platform badge styling
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

              // Status pill styling
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
                  className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-200 flex flex-col"
                >
                  {/* Thumbnail area */}
                  <div className="aspect-[4/3] bg-gray-100 relative overflow-hidden">
                    {hasImage ? (
                      <>
                        <img
                          src={previewImageUrl}
                          alt={displayTitle}
                          className="w-full h-full object-cover"
                          loading="lazy"
                          referrerPolicy={isUserScreenshot ? undefined : "no-referrer"}
                          onError={(e) => {
                            // Fallback to placeholder on error
                            const target = e.target as HTMLImageElement
                            target.style.display = 'none'
                            const placeholder = target.nextElementSibling as HTMLElement
                            if (placeholder) placeholder.style.display = 'flex'
                          }}
                        />
                        {isUserScreenshot && (
                          <div className="absolute top-2 left-2 px-1.5 py-0.5 bg-black/70 text-white text-xs rounded">
                            Your screenshot
                          </div>
                        )}
                        <div className="hidden w-full h-full items-center justify-center bg-gray-50">
                          <div className="text-center">
                            <div className="text-gray-400 text-3xl mb-2">
                              {item.platform === 'TikTok' ? '🎵' : item.platform === 'Instagram' ? '📷' : item.platform === 'YouTube' ? '▶️' : '🔗'}
                            </div>
                            <p className="text-xs text-gray-500 px-4">Preview unavailable</p>
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gray-50">
                        <div className="text-center">
                          <div className="text-gray-400 text-3xl mb-2">
                            {item.platform === 'TikTok' ? '🎵' : item.platform === 'Instagram' ? '📷' : item.platform === 'YouTube' ? '▶️' : '🔗'}
                          </div>
                          <p className="text-xs text-gray-500 px-4">Preview unavailable</p>
                        </div>
                      </div>
                    )}
                    
                    {/* Platform badge - top right */}
                    <div className={`absolute top-2 right-2 px-2 py-1 rounded text-xs font-medium ${getPlatformBadgeStyle(item.platform)}`}>
                      {item.platform}
                    </div>
                  </div>

                  {/* Content area */}
                  <div className="p-4 flex-1 flex flex-col">
                    <h3 className="font-medium text-gray-900 mb-1 line-clamp-2 flex-shrink-0">
                      {displayTitle}
                    </h3>
                    {(item.location_city || item.location_country) && (
                      <p className="text-sm text-gray-600 mb-2 flex-shrink-0">
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
    </div>
  )
}

