'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { detectPlatform, uploadScreenshot, getHostname, cleanOGTitle, generateHostnameTitle } from '@/lib/utils'
import { CATEGORIES, STATUSES } from '@/types/database'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import MobileMenu from '@/components/MobileMenu'
import GooglePlacesInput from '@/components/GooglePlacesInput'

export default function AddItemForm() {
  const [url, setUrl] = useState('')
  const [title, setTitle] = useState('')
  const [notes, setNotes] = useState('')
  const [description, setDescription] = useState('')
  const [thumbnailUrl, setThumbnailUrl] = useState('')
  const [screenshotUrl, setScreenshotUrl] = useState<string | null>(null)
  const [selectedPlace, setSelectedPlace] = useState<{
    place_name: string
    place_id: string
    latitude: number
    longitude: number
    formatted_address: string
    city: string | null
    country: string | null
  } | null>(null)
  const [locationSearchValue, setLocationSearchValue] = useState('')
  const [locationCountry, setLocationCountry] = useState('')
  const [locationCity, setLocationCity] = useState('')
  const [placeName, setPlaceName] = useState('')
  const [placeId, setPlaceId] = useState('')
  const [latitude, setLatitude] = useState<number | null>(null)
  const [longitude, setLongitude] = useState<number | null>(null)
  const [category, setCategory] = useState('')
  const [customCategory, setCustomCategory] = useState('')
  const [showCustomCategoryInput, setShowCustomCategoryInput] = useState(false)
  const [status, setStatus] = useState('')
  const [customStatus, setCustomStatus] = useState('')
  const [showCustomStatusInput, setShowCustomStatusInput] = useState(false)
  const [userCustomCategories, setUserCustomCategories] = useState<string[]>([])
  const [userCustomStatuses, setUserCustomStatuses] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [fetchingMetadata, setFetchingMetadata] = useState(false)
  const [uploadingScreenshot, setUploadingScreenshot] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)
  const [isLocationSuggested, setIsLocationSuggested] = useState(false)
  const [sharedTextImported, setSharedTextImported] = useState(false)
  const [clipboardText, setClipboardText] = useState<string | null>(null)
  const [showClipboardPrompt, setShowClipboardPrompt] = useState(false)
  const [clipboardChecked, setClipboardChecked] = useState(false)
  const [clipboardTextUsed, setClipboardTextUsed] = useState(false)
  
  // Track user edits to prevent overwriting
  const userEditedTitle = useRef(false)
  const userEditedNotes = useRef(false)
  const metadataFetchedRef = useRef(false)
  const initialLoadRef = useRef(false)
  
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
      
      // Load user's custom options
      loadUserCustomOptions(user.id)
    }
    checkAuth()
  }, [supabase, router, searchParams])

  // Load user's custom categories and statuses
  const loadUserCustomOptions = async (userId: string) => {
    try {
      const { data: categories, error: catError } = await supabase
        .from('user_custom_options')
        .select('value')
        .eq('user_id', userId)
        .eq('type', 'category')
        .order('created_at', { ascending: false })

      const { data: statuses, error: statusError } = await supabase
        .from('user_custom_options')
        .select('value')
        .eq('user_id', userId)
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

  // Save custom option to database
  const saveCustomOption = async (type: 'category' | 'status', value: string) => {
    if (!value.trim()) return

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) return

      // Insert custom option (ignore if already exists due to UNIQUE constraint)
      const { error } = await supabase
        .from('user_custom_options')
        .insert({
          user_id: user.id,
          type,
          value: value.trim(),
        })

      if (error && !error.message.includes('duplicate')) {
        console.error('Error saving custom option:', error)
      } else {
        // Refresh the list
        loadUserCustomOptions(user.id)
      }
    } catch (err) {
      console.error('Error saving custom option:', err)
    }
  }

  // Fetch metadata for a URL
  const fetchMetadata = async (urlToFetch: string) => {
    if (!urlToFetch.trim()) return null

    // Validate URL format
    try {
      new URL(urlToFetch)
    } catch {
      return null
    }

    setFetchingMetadata(true)
    try {
      const response = await fetch('/api/metadata', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: urlToFetch }),
      })

      if (!response.ok) {
        return null
      }

      const metadata = await response.json()
      return metadata
    } catch (err) {
      console.error('Error fetching metadata:', err)
      return null
    } finally {
      setFetchingMetadata(false)
    }
  }

  // Search Google Places for location suggestions
  const searchPlaces = async (query: string) => {
    if (!query.trim()) return

    try {
      const response = await fetch('/api/places', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: query.trim() }),
      })

      if (!response.ok) {
        return
      }

      const data = await response.json()

      if (data.place && !locationCity && !locationCountry) {
        // Only suggest if user hasn't already entered location
        setPlaceName(data.place.name)
        setPlaceId(data.place.place_id)
        setLatitude(data.place.geometry.location.lat)
        setLongitude(data.place.geometry.location.lng)
        
        if (data.city) setLocationCity(data.city)
        if (data.country) setLocationCountry(data.country)
        
        setIsLocationSuggested(true)
      }
    } catch (err) {
      console.warn('Error searching places:', err)
      // Non-blocking - continue silently
    }
  }

  // Check clipboard content (requires user interaction or page focus)
  const checkClipboard = async () => {
    if (clipboardChecked) return
    
    // Check if clipboard API is available
    if (!navigator.clipboard || !navigator.clipboard.readText) {
      setClipboardChecked(true)
      return
    }

    try {
      // Try to read clipboard - this requires user interaction or page focus
      const text = await navigator.clipboard.readText()
      
      if (text && text.trim() && text.trim().length > 0) {
        // Don't use if it's just a URL (that should be in the URL field)
        const urlMatch = text.trim().match(/^https?:\/\/[^\s]+$/)
        if (!urlMatch && text.trim().length > 3) {
          // Only show prompt if text is meaningful (more than 3 chars)
          setClipboardText(text.trim())
          setShowClipboardPrompt(true)
        }
      }
    } catch (err: any) {
      // Permission denied or clipboard empty - handle gracefully
      // Don't show errors to user, just silently fail
      if (err.name !== 'NotAllowedError' && err.name !== 'NotFoundError') {
        // Only log unexpected errors in development
        if (process.env.NODE_ENV === 'development') {
          console.debug('Clipboard read failed:', err)
        }
      }
    } finally {
      setClipboardChecked(true)
    }
  }

  // Check clipboard when page loads from a share or on focus
  useEffect(() => {
    if (isAuthenticated !== true || clipboardChecked) return
    
    const urlParam = searchParams.get('url')
    
    // Only check clipboard if we're coming from a share (has URL param)
    if (urlParam) {
      // Try to check clipboard on page focus (browser may allow this)
      const handleFocus = () => {
        checkClipboard()
      }
      
      // Check on initial focus
      if (document.hasFocus()) {
        // Small delay to ensure page is fully loaded
        setTimeout(() => {
          checkClipboard()
        }, 500)
      } else {
        // Wait for window focus
        window.addEventListener('focus', handleFocus, { once: true })
      }
      
      return () => {
        window.removeEventListener('focus', handleFocus)
      }
    } else {
      setClipboardChecked(true)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated])

  // Handle clipboard text acceptance
  const handleUseClipboardText = async () => {
    if (!clipboardText) return

    const trimmedText = clipboardText.trim()
    setClipboardTextUsed(true)
    
    // Apply to Title if empty, otherwise to Notes
    if (!title.trim() && !userEditedTitle.current) {
      setTitle(trimmedText)
      userEditedTitle.current = true
    } else if (!userEditedNotes.current) {
      setNotes(trimmedText)
      userEditedNotes.current = true
    }

    // Try to use clipboard text for location search if no location is set
    if (!selectedPlace && !locationCity && !locationCountry) {
      try {
        const response = await fetch('/api/places', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: trimmedText }),
        })

        if (response.ok) {
          const data = await response.json()
          if (data.place) {
            // Suggest location from clipboard text using Google Places format
            const suggestedPlace = {
              place_name: data.place.name,
              place_id: data.place.place_id,
              latitude: data.place.geometry.location.lat,
              longitude: data.place.geometry.location.lng,
              formatted_address: data.place.formatted_address || '',
              city: data.city,
              country: data.country,
            }
            
            setSelectedPlace(suggestedPlace)
            setLocationSearchValue(suggestedPlace.place_name)
            setIsLocationSuggested(true)
          }
        }
      } catch (err) {
        // Non-blocking - continue silently
        console.debug('Location search from clipboard failed:', err)
      }
    }

    setShowClipboardPrompt(false)
    setClipboardText(null)
  }

  // Handle clipboard text rejection
  const handleIgnoreClipboardText = () => {
    setShowClipboardPrompt(false)
    setClipboardText(null)
  }

  // Initialize form from share parameters and fetch metadata
  useEffect(() => {
    if (isAuthenticated !== true || initialLoadRef.current) return
    initialLoadRef.current = true

    const urlParam = searchParams.get('url')
    const textParam = searchParams.get('text')
    const titleParam = searchParams.get('title')

    // Set URL if present
    if (urlParam) {
      setUrl(urlParam)
    }

    // Handle shared text (pre-fill notes)
    if (textParam && textParam.trim() && !userEditedNotes.current) {
      // Check if text is actually a URL (should go to url field instead)
      const urlMatch = textParam.match(/https?:\/\/[^\s]+/)
      if (!urlMatch) {
        setNotes(textParam.trim())
        setSharedTextImported(true)
      }
    }

    // Handle shared title (highest priority after user edits)
    if (titleParam && titleParam.trim() && !userEditedTitle.current) {
      setTitle(titleParam.trim())
      userEditedTitle.current = true // Mark as set from share
    }

    // If we have a URL, fetch metadata immediately
    if (urlParam) {
      const initializeFromUrl = async () => {
        const metadata = await fetchMetadata(urlParam)
        metadataFetchedRef.current = true

        let finalTitle = title // Start with current title (might be from shared title param)

        if (metadata) {
          // Apply metadata with priority order:
          // 1. User-edited title (already set if titleParam exists)
          // 2. Shared title (already set if titleParam exists)
          // 3. Cleaned OG title
          // 4. Hostname-based title

          if (!userEditedTitle.current) {
            // Try cleaned OG title
            const cleanedTitle = cleanOGTitle(metadata.title)
            if (cleanedTitle) {
              finalTitle = cleanedTitle
              setTitle(cleanedTitle)
            } else {
              // Fallback to hostname-based title
              finalTitle = generateHostnameTitle(urlParam)
              setTitle(finalTitle)
            }
          }

          // Set description (OG description)
          if (metadata.description && !description) {
            setDescription(metadata.description)
          }

          // Set thumbnail (OG image)
          if (metadata.image && !thumbnailUrl) {
            setThumbnailUrl(metadata.image)
          }
        } else {
          // No metadata available - ensure title is never empty
          if (!userEditedTitle.current && !finalTitle) {
            finalTitle = generateHostnameTitle(urlParam)
            setTitle(finalTitle)
          }
        }

        // After metadata is loaded and title is set, try Google Places search
        if (finalTitle && finalTitle.trim() && urlParam) {
          // Small delay to ensure title state is updated
          setTimeout(() => {
            searchPlaces(finalTitle)
          }, 1000)
        }
      }

      initializeFromUrl()
    } else {
      // No URL - metadata fetch will happen when URL is entered
      metadataFetchedRef.current = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, searchParams])

  // Handle URL changes (when user types)
  const handleUrlChange = async (newUrl: string) => {
    setUrl(newUrl)
    
    if (!newUrl.trim()) {
      if (!userEditedTitle.current) setTitle('')
      if (!userEditedNotes.current) setNotes('')
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

    // Only fetch metadata if user hasn't manually edited title
    // and we haven't already fetched for this URL
    if (!userEditedTitle.current && !metadataFetchedRef.current) {
      const metadata = await fetchMetadata(newUrl)
      metadataFetchedRef.current = true

      let finalTitle = title // Start with current title

      if (metadata) {
        const cleanedTitle = cleanOGTitle(metadata.title)
        if (cleanedTitle) {
          finalTitle = cleanedTitle
          setTitle(cleanedTitle)
        } else {
          finalTitle = generateHostnameTitle(newUrl)
          setTitle(finalTitle)
        }

        if (metadata.description) setDescription(metadata.description)
        if (metadata.image && !screenshotUrl) setThumbnailUrl(metadata.image)
      } else {
        // Ensure title is never empty
        if (!finalTitle) {
          finalTitle = generateHostnameTitle(newUrl)
          setTitle(finalTitle)
        }
      }

      // Try Google Places search after title is set
      if (finalTitle && finalTitle.trim() && newUrl) {
        setTimeout(() => {
          searchPlaces(finalTitle)
        }, 1000)
      }
    }
  }

  // Track title edits
  const handleTitleChange = (newTitle: string) => {
    setTitle(newTitle)
    userEditedTitle.current = true
    
    // If title becomes usable, try Google Places search
    if (newTitle.trim() && url) {
      setTimeout(() => {
        searchPlaces(newTitle.trim())
      }, 1000) // Debounce
    }
  }

  // Track notes edits
  const handleNotesChange = (newNotes: string) => {
    setNotes(newNotes)
    userEditedNotes.current = true
  }

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
      // Ensure title is never empty
      let finalTitle = title.trim()
      if (!finalTitle) {
        finalTitle = generateHostnameTitle(url)
      }

      // Detect platform
      const platform = detectPlatform(url)
      
      // Get user (should already be authenticated at this point)
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        // This shouldn't happen if auth check worked, but handle it just in case
        const params = new URLSearchParams()
        searchParams.forEach((value, key) => {
          params.set(key, value)
        })
        if (url.trim()) {
          params.set('url', url.trim())
        }
        
        const redirectPath = params.toString() 
          ? `/add?${params.toString()}`
          : '/add'
        
        setLoading(false)
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

      // Save custom options if they were used
      if (finalCategory && !CATEGORIES.includes(finalCategory as any)) {
        await saveCustomOption('category', finalCategory)
      }
      if (finalStatus && !STATUSES.includes(finalStatus as any)) {
        await saveCustomOption('status', finalStatus)
      }

      // Insert into saved_items
      const { error: insertError } = await supabase
        .from('saved_items')
        .insert({
          user_id: user.id,
          url: url.trim(),
          platform,
          title: finalTitle || null,
          description: description.trim() || null,
          notes: notes.trim() || null,
          thumbnail_url: thumbnailUrl || null,
          screenshot_url: screenshotUrl,
          // Location data: use Google Place if selected, otherwise use manual entry
          ...(selectedPlace
            ? {
                place_name: selectedPlace.place_name,
                place_id: selectedPlace.place_id,
                latitude: selectedPlace.latitude,
                longitude: selectedPlace.longitude,
                formatted_address: selectedPlace.formatted_address,
                location_city: selectedPlace.city,
                location_country: selectedPlace.country,
              }
            : {
                place_name: null,
                place_id: null,
                latitude: null,
                longitude: null,
                formatted_address: null,
                location_city: locationCity.trim() || null,
                location_country: locationCountry.trim() || null,
              }),
          category: finalCategory,
          status: finalStatus,
        })

      if (insertError) {
        console.error('Database insert error:', insertError)
        throw insertError
      }

      // Success - redirect to home page
      setLoading(false)
      router.push('/app')
      router.refresh()
    } catch (err: any) {
      console.error('Error saving item:', err)
      setError(err.message || 'Failed to save item')
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
      // Screenshot always takes priority - don't clear OG thumbnail, just don't show it
    } catch (err: any) {
      const errorMessage = err?.message || 'Failed to upload screenshot'
      if (errorMessage.includes('Bucket not found') || errorMessage.includes('not found') || errorMessage.includes('Storage bucket')) {
        setError('Storage bucket "screenshots" not found. Please create it in your Supabase dashboard under Storage.')
      } else {
        setError(errorMessage || 'Failed to upload screenshot. Please try again.')
      }
    } finally {
      setUploadingScreenshot(false)
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

  const handleRemoveLocationSuggestion = () => {
    setPlaceName('')
    setPlaceId('')
    setLatitude(null)
    setLongitude(null)
    setLocationCity('')
    setLocationCountry('')
    setIsLocationSuggested(false)
  }

  // Determine preview image URL (screenshot > OG > placeholder)
  const previewImageUrl = screenshotUrl || thumbnailUrl || null
  const hasPreview = !!previewImageUrl
  const isUserScreenshot = !!screenshotUrl
  const isOGImage = !!thumbnailUrl && !screenshotUrl

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
            <Link href="/app" className="text-2xl font-bold text-gray-900">
              FiBi
            </Link>
            <div className="flex items-center gap-4">
              {/* Desktop cancel button */}
              <Link
                href="/app"
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

            {/* Clipboard prompt */}
            {showClipboardPrompt && clipboardText && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm font-medium text-gray-900 mb-2">
                  Use copied text for this place?
                </p>
                <p className="text-xs text-gray-600 mb-3 line-clamp-2">
                  {clipboardText.length > 100 ? `${clipboardText.substring(0, 100)}...` : clipboardText}
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleUseClipboardText}
                    className="px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors"
                  >
                    Use text
                  </button>
                  <button
                    type="button"
                    onClick={handleIgnoreClipboardText}
                    className="px-4 py-2 bg-white text-gray-700 text-sm font-medium border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Ignore
                  </button>
                </div>
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

            {/* Title - editable, never empty */}
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
                Title
              </label>
              <input
                id="title"
                type="text"
                value={title}
                onChange={(e) => handleTitleChange(e.target.value)}
                placeholder="Enter a title"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
              />
            </div>

            {/* Notes - editable, pre-filled from shared text or clipboard */}
            <div>
              <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-2">
                Notes
                {notes && clipboardTextUsed && (
                  <span className="ml-2 text-xs font-normal text-gray-500">(Copied text)</span>
                )}
              </label>
              <textarea
                id="notes"
                value={notes}
                onChange={(e) => handleNotesChange(e.target.value)}
                rows={4}
                placeholder="Add your own notes about this place..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent resize-none"
              />
              {sharedTextImported && notes && (
                <p className="mt-1 text-xs text-gray-500">Imported text</p>
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

            {/* Preview area - screenshot-first strategy */}
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
                    {isOGImage && (
                      <div className="absolute top-2 left-2 px-2 py-1 bg-black/70 text-white text-xs rounded">
                        From link
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
              <div className="mt-3">
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
                  className="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
                      Add your own screenshot
                    </>
                  )}
                </button>
                <p className="mt-2 text-xs text-gray-500">
                  Some apps don&apos;t share previews. A screenshot or copied text helps keep the context.
                </p>
              </div>
            </div>

            {/* Location fields */}
            <GooglePlacesInput
              value={locationSearchValue}
              onChange={(place) => {
                setSelectedPlace(place)
                if (place) {
                  setLocationSearchValue(place.place_name)
                  // Clear manual inputs when place is selected
                  setLocationCity('')
                  setLocationCountry('')
                  // Clear old place state
                  setPlaceName('')
                  setPlaceId('')
                  setLatitude(null)
                  setLongitude(null)
                  setIsLocationSuggested(false)
                } else {
                  setLocationSearchValue('')
                }
              }}
              onSearchValueChange={(value) => {
                setLocationSearchValue(value)
              }}
              onManualCityChange={(city) => {
                setLocationCity(city)
                // Clear Google place data when manually entering
                if (selectedPlace) {
                  setSelectedPlace(null)
                  setLocationSearchValue('')
                }
                setPlaceName('')
                setPlaceId('')
                setLatitude(null)
                setLongitude(null)
                setIsLocationSuggested(false)
              }}
              onManualCountryChange={(country) => {
                setLocationCountry(country)
                // Clear Google place data when manually entering
                if (selectedPlace) {
                  setSelectedPlace(null)
                  setLocationSearchValue('')
                }
                setPlaceName('')
                setPlaceId('')
                setLatitude(null)
                setLongitude(null)
                setIsLocationSuggested(false)
              }}
              manualCity={locationCity}
              manualCountry={locationCountry}
              id="location-search"
            />

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Category
              </label>
              <div className="flex flex-wrap gap-2 mb-2 overflow-x-auto max-h-[calc(3*2.5rem+0.5rem)]" style={{ scrollbarWidth: 'thin' }}>
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => {
                      setCategory(category === cat ? '' : cat)
                      setShowCustomCategoryInput(false)
                      setCustomCategory('')
                    }}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                      category === cat && !showCustomCategoryInput
                        ? 'bg-gray-900 text-white'
                        : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
                {userCustomCategories.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => {
                      setCategory(category === cat ? '' : cat)
                      setShowCustomCategoryInput(false)
                      setCustomCategory('')
                    }}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                      category === cat && !showCustomCategoryInput
                        ? 'bg-gray-900 text-white'
                        : 'bg-gray-100 text-gray-700 border border-gray-300 hover:bg-gray-200'
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
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
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
              <div className="flex flex-wrap gap-2 mb-2 overflow-x-auto max-h-[calc(3*2.5rem+0.5rem)]" style={{ scrollbarWidth: 'thin' }}>
                {STATUSES.map((stat) => (
                  <button
                    key={stat}
                    type="button"
                    onClick={() => {
                      setStatus(status === stat ? '' : stat)
                      setShowCustomStatusInput(false)
                      setCustomStatus('')
                    }}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                      status === stat && !showCustomStatusInput
                        ? 'bg-gray-900 text-white'
                        : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {stat}
                  </button>
                ))}
                {userCustomStatuses.map((stat) => (
                  <button
                    key={stat}
                    type="button"
                    onClick={() => {
                      setStatus(status === stat ? '' : stat)
                      setShowCustomStatusInput(false)
                      setCustomStatus('')
                    }}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                      status === stat && !showCustomStatusInput
                        ? 'bg-gray-900 text-white'
                        : 'bg-gray-100 text-gray-700 border border-gray-300 hover:bg-gray-200'
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
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
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
                href="/app"
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
