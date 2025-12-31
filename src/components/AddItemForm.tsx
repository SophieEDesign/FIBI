'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { detectPlatform } from '@/lib/utils'
import { CATEGORIES, STATUSES } from '@/types/database'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import MobileMenu from '@/components/MobileMenu'

export default function AddItemForm() {
  const [url, setUrl] = useState('')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [thumbnailUrl, setThumbnailUrl] = useState('')
  const [locationCountry, setLocationCountry] = useState('')
  const [locationCity, setLocationCity] = useState('')
  const [category, setCategory] = useState('')
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(false)
  const [fetchingMetadata, setFetchingMetadata] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)
  const supabase = createClient()
  const router = useRouter()
  const searchParams = useSearchParams()

  // Check auth state and redirect to login if not authenticated
  useEffect(() => {
    const checkAuth = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      
      if (!user) {
        // Build redirect URL preserving all query params and any entered URL
        const params = new URLSearchParams()
        
        // Preserve existing query params (e.g., from share target)
        searchParams.forEach((value, key) => {
          params.set(key, value)
        })
        
        // If user has entered a URL in the form, preserve it
        if (url.trim()) {
          params.set('url', url.trim())
        }
        
        // Build the redirect URL
        const redirectPath = params.toString() 
          ? `/add?${params.toString()}`
          : '/add'
        
        router.push(`/login?redirect=${encodeURIComponent(redirectPath)}`)
        return
      }
      
      setIsAuthenticated(true)
    }
    checkAuth()
  }, [supabase, router, searchParams, url])

  const handleUrlChange = async (newUrl: string) => {
    setUrl(newUrl)
    
    if (!newUrl.trim()) {
      setTitle('')
      setDescription('')
      setThumbnailUrl('')
      return
    }

    // Validate URL format
    try {
      new URL(newUrl)
    } catch {
      return
    }

    // Fetch metadata
    setFetchingMetadata(true)
    try {
      const response = await fetch('/api/metadata', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: newUrl }),
      })

      const metadata = await response.json()
      
      if (metadata.title) setTitle(metadata.title)
      if (metadata.description) setDescription(metadata.description)
      if (metadata.image) setThumbnailUrl(metadata.image)
    } catch (err) {
      console.error('Error fetching metadata:', err)
    } finally {
      setFetchingMetadata(false)
    }
  }

  // Read URL from query parameters (for share target or after login redirect)
  useEffect(() => {
    // Only run this if we're authenticated (to avoid conflicts with auth check)
    if (isAuthenticated === null) return
    
    const urlParam = searchParams.get('url')
    if (urlParam && urlParam !== url) {
      // Clear any existing errors when prefilling from share or redirect
      setError(null)
      setUrl(urlParam)
      handleUrlChange(urlParam)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, isAuthenticated])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    if (!url.trim()) {
      setError('URL is required')
      setLoading(false)
      return
    }

    try {
      // Fetch metadata on submit if not already fetched
      let finalTitle = title
      let finalDescription = description
      let finalThumbnailUrl = thumbnailUrl

      if (!finalTitle || !finalThumbnailUrl) {
        try {
          const response = await fetch('/api/metadata', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: url.trim() }),
          })
          const metadata = await response.json()
          if (metadata.title && !finalTitle) finalTitle = metadata.title
          if (metadata.description && !finalDescription) finalDescription = metadata.description
          if (metadata.image && !finalThumbnailUrl) finalThumbnailUrl = metadata.image
        } catch (err) {
          console.error('Error fetching metadata:', err)
          // Continue even if metadata fetch fails
        }
      }

      // Detect platform
      const platform = detectPlatform(url)
      
      // Get user (should already be authenticated at this point)
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        // This shouldn't happen if auth check worked, but handle it just in case
        // Preserve all form data in the redirect URL
        const params = new URLSearchParams()
        
        // Preserve existing query params
        searchParams.forEach((value, key) => {
          params.set(key, value)
        })
        
        // Preserve entered URL if any
        if (url.trim()) {
          params.set('url', url.trim())
        }
        
        const redirectPath = params.toString() 
          ? `/add?${params.toString()}`
          : '/add'
        
        router.push(`/login?redirect=${encodeURIComponent(redirectPath)}`)
        return
      }

      // Insert into saved_items
      const { error: insertError } = await supabase
        .from('saved_items')
        .insert({
          user_id: user.id,
          url: url.trim(),
          platform,
          title: finalTitle.trim() || null,
          description: finalDescription.trim() || null,
          thumbnail_url: finalThumbnailUrl.trim() || null,
          location_country: locationCountry.trim() || null,
          location_city: locationCity.trim() || null,
          category: category || null,
          status: status || null,
        })

      if (insertError) throw insertError

      // Redirect to /
      router.push('/')
      router.refresh()
    } catch (err: any) {
      setError(err.message || 'Failed to save item')
    } finally {
      setLoading(false)
    }
  }

  // Show loading state while checking authentication
  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    )
  }

  // Only render form if authenticated (if not authenticated, redirect will happen)
  if (!isAuthenticated) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between relative">
            <Link href="/" className="text-2xl font-bold text-gray-900">
              FiBi
            </Link>
            <div className="flex items-center gap-4">
              {/* Desktop cancel button */}
              <Link
                href="/"
                className="hidden md:block text-gray-600 hover:text-gray-900 text-sm font-medium"
              >
                Cancel
              </Link>
              {/* Mobile menu */}
              <MobileMenu
                isAuthenticated={isAuthenticated}
                onSignOut={async () => {
                  await supabase.auth.signOut()
                  router.push('/login')
                  router.refresh()
                }}
              />
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-2xl shadow-sm p-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">Add a Place</h1>

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="url" className="block text-sm font-medium text-gray-700 mb-2">
                URL <span className="text-red-500">*</span>
              </label>
              <input
                id="url"
                type="url"
                value={url}
                onChange={(e) => handleUrlChange(e.target.value)}
                required
                placeholder="https://..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
              />
              {fetchingMetadata && (
                <p className="mt-1 text-sm text-gray-500">Fetching metadata...</p>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="location_city" className="block text-sm font-medium text-gray-700 mb-2">
                  City
                </label>
                <input
                  id="location_city"
                  type="text"
                  value={locationCity}
                  onChange={(e) => setLocationCity(e.target.value)}
                  placeholder="e.g. London"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                />
              </div>

              <div>
                <label htmlFor="location_country" className="block text-sm font-medium text-gray-700 mb-2">
                  Country
                </label>
                <input
                  id="location_country"
                  type="text"
                  value={locationCountry}
                  onChange={(e) => setLocationCountry(e.target.value)}
                  placeholder="e.g. United Kingdom"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Category
              </label>
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategory(category === cat ? '' : cat)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      category === cat
                        ? 'bg-gray-900 text-white'
                        : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status
              </label>
              <div className="flex flex-wrap gap-2">
                {STATUSES.map((stat) => (
                  <button
                    key={stat}
                    type="button"
                    onClick={() => setStatus(status === stat ? '' : stat)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      status === stat
                        ? 'bg-gray-900 text-white'
                        : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {stat}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-4 pt-4">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-gray-900 text-white py-2 px-4 rounded-lg font-medium hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Saving...' : 'Save Place'}
              </button>
              <Link
                href="/"
                className="px-6 py-2 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </Link>
            </div>
          </form>
        </div>
      </main>
    </div>
  )
}

