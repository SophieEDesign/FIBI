'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { detectPlatform, uploadScreenshot, getHostname } from '@/lib/utils'
import { CATEGORIES, STATUSES } from '@/types/database'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import MobileMenu from '@/components/MobileMenu'

export default function AddItemForm() {
  const [url, setUrl] = useState('')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [thumbnailUrl, setThumbnailUrl] = useState('')
  const [screenshotUrl, setScreenshotUrl] = useState<string | null>(null)
  const [locationCountry, setLocationCountry] = useState('')
  const [locationCity, setLocationCity] = useState('')
  const [category, setCategory] = useState('')
  const [customCategory, setCustomCategory] = useState('')
  const [showCustomCategoryInput, setShowCustomCategoryInput] = useState(false)
  const [status, setStatus] = useState('')
  const [customStatus, setCustomStatus] = useState('')
  const [showCustomStatusInput, setShowCustomStatusInput] = useState(false)
  const [loading, setLoading] = useState(false)
  const [fetchingMetadata, setFetchingMetadata] = useState(false)
  const [uploadingScreenshot, setUploadingScreenshot] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)
  const authCheckedRef = useRef(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()
  const router = useRouter()
  const searchParams = useSearchParams()

  // Check auth state and redirect to login if not authenticated (only once on mount)
  useEffect(() => {
    // Only check auth once
    if (authCheckedRef.current) return
    authCheckedRef.current = true
    
    const checkAuth = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      
      if (!user) {
        // Build redirect URL preserving all query params (e.g., from share target)
        const params = new URLSearchParams()
        
        // Preserve existing query params
        searchParams.forEach((value, key) => {
          params.set(key, value)
        })
        
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
  }, [supabase, router, searchParams])

  const handleUrlChange = async (newUrl: string) => {
    setUrl(newUrl)
    
    if (!newUrl.trim()) {
      setTitle('')
      setDescription('')
      setThumbnailUrl('')
      setScreenshotUrl(null)
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
    if (isAuthenticated !== true) return
    
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

      // Use custom category/status if provided, otherwise use selected one
      const finalCategory = showCustomCategoryInput && customCategory.trim() 
        ? customCategory.trim() 
        : category || null
      const finalStatus = showCustomStatusInput && customStatus.trim() 
        ? customStatus.trim() 
        : status || null

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
          screenshot_url: screenshotUrl,
          location_country: locationCountry.trim() || null,
          location_city: locationCity.trim() || null,
          category: finalCategory,
          status: finalStatus,
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

  const handleScreenshotUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadingScreenshot(true)
    setError(null)

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        setError('You must be logged in to upload screenshots')
        return
      }

      const uploadedUrl = await uploadScreenshot(file, user.id, null, supabase)

      if (!uploadedUrl) {
        setError('Failed to upload screenshot. Please try again.')
        return
      }

      setScreenshotUrl(uploadedUrl)
      // Clear OG thumbnail when user uploads their own screenshot
      setThumbnailUrl('')
    } catch (err: any) {
      setError(err.message || 'Failed to upload screenshot')
    } finally {
      setUploadingScreenshot(false)
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleRemoveScreenshot = () => {
    setScreenshotUrl(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  // Determine preview image URL (screenshot > OG > placeholder)
  const previewImageUrl = screenshotUrl || thumbnailUrl || null
  const hasPreview = !!previewImageUrl
  const isUserScreenshot = !!screenshotUrl

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

            {/* Title - editable */}
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
                Title
              </label>
              <input
                id="title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter a title or leave blank to use metadata title"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
              />
              {fetchingMetadata && !title && (
                <p className="mt-1 text-xs text-gray-500">Title will be fetched from the URL if left blank</p>
              )}
            </div>

            {/* Original post text / Description */}
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                Original Post Text
              </label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                placeholder="Original post text from the link (will be fetched automatically if available)..."
                className={`w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent resize-none ${
                  description ? 'bg-gray-50' : 'bg-white'
                }`}
              />
              {description && (
                <p className="mt-1 text-xs text-gray-500">Fetched from the original post. You can edit this.</p>
              )}
            </div>

            {/* Preview area */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Preview
              </label>
              <div className="aspect-video bg-gray-100 rounded-lg overflow-hidden relative border border-gray-200">
                {hasPreview ? (
                  <>
                    <img
                      src={previewImageUrl}
                      alt={title || 'Preview'}
                      className="w-full h-full object-cover"
                    />
                    {isUserScreenshot && (
                      <div className="absolute top-2 left-2 px-2 py-1 bg-black/70 text-white text-xs rounded">
                        Your screenshot
                      </div>
                    )}
                    {screenshotUrl && (
                      <button
                        type="button"
                        onClick={handleRemoveScreenshot}
                        className="absolute top-2 right-2 p-1.5 bg-black/70 text-white rounded hover:bg-black/90 transition-colors"
                        aria-label="Remove screenshot"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </>
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <div className="text-center">
                      <div className="text-gray-400 text-4xl mb-2">
                        {url ? '🔗' : '📷'}
                      </div>
                      <p className="text-sm text-gray-500">No preview available</p>
                    </div>
                  </div>
                )}
              </div>
              <div className="mt-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/webp"
                  onChange={handleScreenshotUpload}
                  className="hidden"
                  id="screenshot-upload"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingScreenshot}
                  className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {uploadingScreenshot ? (
                    <>
                      <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Uploading...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      {screenshotUrl ? 'Replace screenshot' : 'Add your own screenshot'}
                    </>
                  )}
                </button>
              </div>
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
              <div className="flex flex-wrap gap-2 mb-2">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => {
                      setCategory(category === cat ? '' : cat)
                      setShowCustomCategoryInput(false)
                      setCustomCategory('')
                    }}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      category === cat && !showCustomCategoryInput
                        ? 'bg-gray-900 text-white'
                        : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => {
                    setShowCustomCategoryInput(!showCustomCategoryInput)
                    if (!showCustomCategoryInput) {
                      setCategory('')
                      setCustomCategory('')
                    }
                  }}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    showCustomCategoryInput
                      ? 'bg-gray-900 text-white'
                      : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  + Custom
                </button>
              </div>
              {showCustomCategoryInput && (
                <input
                  type="text"
                  value={customCategory}
                  onChange={(e) => setCustomCategory(e.target.value)}
                  placeholder="Enter custom category..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                />
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status
              </label>
              <div className="flex flex-wrap gap-2 mb-2">
                {STATUSES.map((stat) => (
                  <button
                    key={stat}
                    type="button"
                    onClick={() => {
                      setStatus(status === stat ? '' : stat)
                      setShowCustomStatusInput(false)
                      setCustomStatus('')
                    }}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      status === stat && !showCustomStatusInput
                        ? 'bg-gray-900 text-white'
                        : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {stat}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => {
                    setShowCustomStatusInput(!showCustomStatusInput)
                    if (!showCustomStatusInput) {
                      setStatus('')
                      setCustomStatus('')
                    }
                  }}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    showCustomStatusInput
                      ? 'bg-gray-900 text-white'
                      : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  + Custom
                </button>
              </div>
              {showCustomStatusInput && (
                <input
                  type="text"
                  value={customStatus}
                  onChange={(e) => setCustomStatus(e.target.value)}
                  placeholder="Enter custom status..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                />
              )}
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

