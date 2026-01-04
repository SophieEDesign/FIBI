'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { detectPlatform, uploadScreenshot, getHostname, cleanOGTitle, generateHostnameTitle, extractGoogleMapsPlace } from '@/lib/utils'
import { CATEGORIES, STATUSES } from '@/types/database'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import MobileMenu from '@/components/MobileMenu'
import GooglePlacesInput from '@/components/GooglePlacesInput'
import LinkPreview from '@/components/LinkPreview'

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
  const [categories, setCategories] = useState<string[]>([])
  const [customCategory, setCustomCategory] = useState('')
  const [showCustomCategoryInput, setShowCustomCategoryInput] = useState(false)
  const [statuses, setStatuses] = useState<string[]>([])
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
  
  // AI suggestions state
  const [aiSuggestions, setAiSuggestions] = useState<{
    title: string | null
    placeName: string | null
    city: string | null
    country: string | null
    category: string | null
    confidence: {
      title: 'high' | 'medium' | 'low'
      location: 'high' | 'medium' | 'low'
      category: 'high' | 'medium' | 'low'
    }
  } | null>(null)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiEnrichmentTriggered, setAiEnrichmentTriggered] = useState(false)
  
  // Track user edits to prevent overwriting
  const userEditedTitle = useRef(false)
  const userEditedNotes = useRef(false)
  const userEditedDescription = useRef(false)
  const userEditedLocation = useRef(false)
  const userEditedCategory = useRef(false)
  const metadataFetchedRef = useRef(false)
  const initialLoadRef = useRef(false)
  const aiEnrichmentTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  
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
      console.log('AddItemForm: Metadata fetched:', {
        hasTitle: !!metadata.title,
        title: metadata.title?.substring(0, 100) || null,
        hasDescription: !!metadata.description,
        description: metadata.description?.substring(0, 200) || null,
        descriptionLength: metadata.description?.length || 0,
        hasImage: !!metadata.image,
        imageUrl: metadata.image?.substring(0, 100) || null,
        hasScrapedContent: !!metadata.scrapedContent,
        scrapedContentLength: metadata.scrapedContent?.length || 0,
        fullMetadata: metadata, // Show full object for debugging
      })
      return metadata
    } catch (err) {
      console.error('Error fetching metadata:', err)
      return null
    } finally {
      setFetchingMetadata(false)
    }
  }

  // AI enrichment function (non-blocking, async)
  const triggerAIEnrichment = async (urlToEnrich: string, currentTitle: string, currentDescription: string, scrapedContent?: string | null) => {
    console.log('triggerAIEnrichment called:', { urlToEnrich, currentTitle, currentDescription, scrapedContent: scrapedContent?.substring(0, 100), aiEnrichmentTriggered })
    
    // Don't trigger if already triggered or if user has edited fields
    if (aiEnrichmentTriggered || !urlToEnrich.trim()) {
      console.log('AI enrichment: Skipping - already triggered or no URL')
      return
    }
    
    // Debounce: clear existing timeout
    if (aiEnrichmentTimeoutRef.current) {
      clearTimeout(aiEnrichmentTimeoutRef.current)
    }
    
    console.log('AI enrichment: Setting timeout (2s delay)')
    
    // Set timeout to trigger AI enrichment after a delay
    aiEnrichmentTimeoutRef.current = setTimeout(async () => {
      console.log('AI enrichment: Timeout fired, making API call')
      setAiLoading(true)
      setAiEnrichmentTriggered(true)
      
      try {
        const platform = detectPlatform(urlToEnrich)
        const domain = getHostname(urlToEnrich)
        
        console.log('AI enrichment: Calling API with:', { url: urlToEnrich, title: currentTitle, description: currentDescription, domain, platform })
        
        const response = await fetch('/api/ai-enrich', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            url: urlToEnrich,
            title: currentTitle || null,
            description: currentDescription || null,
            domain: domain || null,
            platform: platform || null,
            scrapedContent: scrapedContent || null, // Pass scraped page content to AI
          }),
        })
        
        console.log('AI enrichment: API response status:', response.status)
        
        if (response.ok) {
          const data = await response.json()
          console.log('AI enrichment response:', data)
          
          // Check if there's an error message in the response (e.g., quota exceeded)
          if (data.error) {
            console.warn('AI enrichment: API returned error:', data.error)
            // Don't set suggestions if there's an error, but don't block the form
            return
          }
          
          // Log comparison with current values
          console.log('AI enrichment: Comparing suggestions with current values', {
            title: { current: title, suggested: data.suggestedTitle, different: data.suggestedTitle && data.suggestedTitle !== title },
            location: { 
              current: { place: selectedPlace?.place_name, city: locationCity, country: locationCountry },
              suggested: { place: data.suggestedPlaceName, city: data.suggestedCity, country: data.suggestedCountry }
            },
            category: { current: categories, suggested: data.suggestedCategory },
          })
          
          // Only set suggestions if we have at least one non-null suggestion
          if (data.suggestedTitle || data.suggestedPlaceName || data.suggestedCity || data.suggestedCountry || data.suggestedCategory) {
            console.log('AI enrichment: Setting suggestions', {
              title: data.suggestedTitle,
              placeName: data.suggestedPlaceName,
              city: data.suggestedCity,
              country: data.suggestedCountry,
              category: data.suggestedCategory,
            })
            setAiSuggestions({
              title: data.suggestedTitle,
              placeName: data.suggestedPlaceName,
              city: data.suggestedCity,
              country: data.suggestedCountry,
              category: data.suggestedCategory,
              confidence: data.confidence || {
                title: 'low',
                location: 'low',
                category: 'low',
              },
            })
          } else {
            console.log('AI enrichment: No suggestions returned - all fields are null. This could mean: API key not configured, quota exceeded, or AI found no suggestions.')
          }
        } else {
          const errorText = await response.text()
          console.warn('AI enrichment: API returned error status:', response.status, errorText)
        }
      } catch (err) {
        console.debug('AI enrichment failed (non-blocking):', err)
        // Silently fail - don't show error to user
      } finally {
        setAiLoading(false)
      }
    }, 2000) // 2 second debounce after metadata fetch
  }

  // Cleanup timeout on unmount or URL change
  useEffect(() => {
    return () => {
      if (aiEnrichmentTimeoutRef.current) {
        clearTimeout(aiEnrichmentTimeoutRef.current)
      }
    }
  }, [url])

  // Trigger AI enrichment if URL is already present when component mounts
  // This handles the case where page loads with URL already in the field
  useEffect(() => {
    if (url && url.trim() && !aiEnrichmentTriggered && metadataFetchedRef.current && !aiEnrichmentTimeoutRef.current) {
      console.log('AddItemForm: URL present on mount, triggering AI enrichment after delay', { url })
      // Small delay to ensure metadata is loaded
      // Note: We can't access metadata here, so we'll trigger without scraped content
      // The handleUrlChange will handle it properly when URL is typed
      const timeout = setTimeout(() => {
        triggerAIEnrichment(url, title || '', description || '', null)
      }, 1000)
      return () => clearTimeout(timeout)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, title, description])

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
        // Check if it's a Google Maps URL and extract place info
        const mapsPlace = extractGoogleMapsPlace(urlParam)
        
        if (mapsPlace.placeName || mapsPlace.coordinates || mapsPlace.query) {
          // It's a Google Maps URL - extract location data
          if (mapsPlace.coordinates) {
            // We have coordinates - use reverse geocoding to get place details
            try {
              const response = await fetch('/api/places', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                  query: `${mapsPlace.coordinates.lat},${mapsPlace.coordinates.lng}` 
                }),
              })

              if (response.ok) {
                const data = await response.json()
                if (data.place) {
                  // Set the place from coordinates
                  const googlePlace = {
                    place_name: data.place.name,
                    place_id: data.place.place_id,
                    latitude: data.place.geometry.location.lat,
                    longitude: data.place.geometry.location.lng,
                    formatted_address: data.place.formatted_address || '',
                    city: data.city,
                    country: data.country,
                  }
                  
                  setSelectedPlace(googlePlace)
                  setLocationSearchValue(googlePlace.place_name)
                  
                  // Set title if not already set
                  if (!userEditedTitle.current && !titleParam) {
                    setTitle(googlePlace.place_name)
                  }
                }
              }
            } catch (err) {
              console.warn('Error fetching place from coordinates:', err)
            }
          } else if (mapsPlace.query) {
            // We have a place name query - search for it
            try {
              const response = await fetch('/api/places', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query: mapsPlace.query }),
              })

              if (response.ok) {
                const data = await response.json()
                if (data.place) {
                  const googlePlace = {
                    place_name: data.place.name,
                    place_id: data.place.place_id,
                    latitude: data.place.geometry.location.lat,
                    longitude: data.place.geometry.location.lng,
                    formatted_address: data.place.formatted_address || '',
                    city: data.city,
                    country: data.country,
                  }
                  
                  setSelectedPlace(googlePlace)
                  setLocationSearchValue(googlePlace.place_name)
                  
                  // Set title if not already set
                  if (!userEditedTitle.current && !titleParam) {
                    setTitle(googlePlace.place_name)
                  }
                }
              }
            } catch (err) {
              console.warn('Error searching place from Google Maps URL:', err)
            }
          }
        }

        // Fetch metadata for non-Google Maps URLs or as fallback
        const metadata = await fetchMetadata(urlParam)
        metadataFetchedRef.current = true

        let finalTitle = title // Start with current title (might be from shared title param or Google Maps)
        let finalDescription = description // Track description for AI enrichment

        if (metadata) {
          // Apply metadata with priority order:
          // 1. User-edited title (already set if titleParam exists)
          // 2. Shared title (already set if titleParam exists)
          // 3. Google Maps place name (already set above)
          // 4. Cleaned OG title
          // 5. Hostname-based title

          if (!userEditedTitle.current && !finalTitle) {
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

          // Set description (OG description or scraped content)
          // Always set if we have metadata description and current description is empty
          // Use scrapedContent as fallback if description is not available
          const descriptionToUse = metadata.description || metadata.scrapedContent
          if (descriptionToUse) {
            console.log('AddItemForm: Setting description from metadata', {
              metadataDescription: metadata.description?.substring(0, 100) || null,
              scrapedContent: metadata.scrapedContent?.substring(0, 100) || null,
              usingScrapedContent: !metadata.description && !!metadata.scrapedContent,
              currentDescription: description.substring(0, 100),
              willSet: !description || description.trim() === '',
            })
            if (!description || description.trim() === '') {
              setDescription(descriptionToUse)
              finalDescription = descriptionToUse
            } else {
              // If description already exists, still track it for AI enrichment
              finalDescription = description
            }
          } else {
            console.log('AddItemForm: No description in metadata', {
              hasDescription: !!metadata.description,
              hasScrapedContent: !!metadata.scrapedContent,
              scrapedContentLength: metadata.scrapedContent?.length || 0,
            })
          }

          // Set thumbnail (OG image)
          if (metadata.image && !thumbnailUrl) {
            console.log('AddItemForm: Setting thumbnail from metadata', {
              imageUrl: metadata.image.substring(0, 100),
              currentThumbnail: thumbnailUrl.substring(0, 100) || 'none',
            })
            setThumbnailUrl(metadata.image)
          } else {
            console.log('AddItemForm: No image in metadata or thumbnail already set', {
              hasImage: !!metadata.image,
              hasThumbnail: !!thumbnailUrl,
            })
          }
        } else {
          // No metadata available - ensure title is never empty
          if (!userEditedTitle.current && !finalTitle) {
            finalTitle = generateHostnameTitle(urlParam)
            setTitle(finalTitle)
          }
        }

        // After metadata is loaded and title is set, try Google Places search (if not already done)
        if (finalTitle && finalTitle.trim() && urlParam && !mapsPlace.placeName && !mapsPlace.coordinates) {
          // Small delay to ensure title state is updated
          setTimeout(() => {
            searchPlaces(finalTitle)
          }, 1000)
        }

        // Trigger AI enrichment after metadata is loaded (non-blocking)
        console.log('AddItemForm: About to trigger AI enrichment from share flow', {
          url: urlParam,
          title: finalTitle,
          description: finalDescription,
          scrapedContent: metadata?.scrapedContent?.substring(0, 100),
          metadataFetched: metadataFetchedRef.current,
        })
        triggerAIEnrichment(urlParam, finalTitle || '', finalDescription || '', metadata?.scrapedContent || null)
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
    
    // Reset AI enrichment state for new URL
    setAiEnrichmentTriggered(false)
    setAiSuggestions(null)
    setAiLoading(false)
    if (aiEnrichmentTimeoutRef.current) {
      clearTimeout(aiEnrichmentTimeoutRef.current)
      aiEnrichmentTimeoutRef.current = null
    }
    
    if (!newUrl.trim()) {
      // Reset metadata fetch flag when URL is cleared so new URLs can trigger fetch
      metadataFetchedRef.current = false
      if (!userEditedTitle.current) setTitle('')
      if (!userEditedNotes.current) setNotes('')
      setDescription('')
      setThumbnailUrl('')
      setScreenshotUrl(null)
      // Clear location if URL is cleared
      if (selectedPlace) {
        setSelectedPlace(null)
        setLocationSearchValue('')
      }
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
    // Note: Reset metadataFetchedRef when URL changes to allow re-fetching
    if (!userEditedTitle.current) {
      // Reset the flag if URL changed (allows re-fetching for new URLs)
      if (metadataFetchedRef.current && url !== newUrl) {
        metadataFetchedRef.current = false
      }
      
      if (!metadataFetchedRef.current) {
      // Check if it's a Google Maps URL and extract place info
      const mapsPlace = extractGoogleMapsPlace(newUrl)
      
      if (mapsPlace.placeName || mapsPlace.coordinates || mapsPlace.query) {
        // It's a Google Maps URL - extract location data
        if (mapsPlace.coordinates) {
          // We have coordinates - use reverse geocoding to get place details
          try {
            const response = await fetch('/api/places', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ 
                query: `${mapsPlace.coordinates.lat},${mapsPlace.coordinates.lng}` 
              }),
            })

            if (response.ok) {
              const data = await response.json()
              if (data.place) {
                const googlePlace = {
                  place_name: data.place.name,
                  place_id: data.place.place_id,
                  latitude: data.place.geometry.location.lat,
                  longitude: data.place.geometry.location.lng,
                  formatted_address: data.place.formatted_address || '',
                  city: data.city,
                  country: data.country,
                }
                
                setSelectedPlace(googlePlace)
                setLocationSearchValue(googlePlace.place_name)
                
                // Set title if not already set
                if (!userEditedTitle.current) {
                  setTitle(googlePlace.place_name)
                }
                
                metadataFetchedRef.current = true
                
                // Trigger AI enrichment for Google Maps URLs too (can still suggest category, etc.)
                triggerAIEnrichment(newUrl, googlePlace.place_name || '', description || '', null)
                return // Skip metadata fetch for Google Maps URLs
              }
            }
          } catch (err) {
            console.warn('Error fetching place from coordinates:', err)
          }
        } else if (mapsPlace.query) {
          // We have a place name query - search for it
          try {
            const response = await fetch('/api/places', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ query: mapsPlace.query }),
            })

            if (response.ok) {
              const data = await response.json()
              if (data.place) {
                const googlePlace = {
                  place_name: data.place.name,
                  place_id: data.place.place_id,
                  latitude: data.place.geometry.location.lat,
                  longitude: data.place.geometry.location.lng,
                  formatted_address: data.place.formatted_address || '',
                  city: data.city,
                  country: data.country,
                }
                
                setSelectedPlace(googlePlace)
                setLocationSearchValue(googlePlace.place_name)
                
                // Set title if not already set
                if (!userEditedTitle.current) {
                  setTitle(googlePlace.place_name)
                }
                
                metadataFetchedRef.current = true
                
                // Trigger AI enrichment for Google Maps URLs too (can still suggest category, etc.)
                triggerAIEnrichment(newUrl, googlePlace.place_name || '', description || '', null)
                return // Skip metadata fetch for Google Maps URLs
              }
            }
          } catch (err) {
            console.warn('Error searching place from Google Maps URL:', err)
          }
        }
      }

      // Fetch metadata for non-Google Maps URLs
      const metadata = await fetchMetadata(newUrl)
      metadataFetchedRef.current = true

      let finalTitle = title // Start with current title
      let finalDescription = description // Track description for AI enrichment

      if (metadata) {
        const cleanedTitle = cleanOGTitle(metadata.title)
        if (cleanedTitle) {
          finalTitle = cleanedTitle
          setTitle(cleanedTitle)
        } else {
          finalTitle = generateHostnameTitle(newUrl)
          setTitle(finalTitle)
        }

        // Set description (always set if we have it and current is empty)
        // Use scrapedContent as fallback if description is not available
        const descriptionToUse = metadata.description || metadata.scrapedContent
        if (descriptionToUse) {
          console.log('AddItemForm: Setting description from metadata (handleUrlChange)', {
            metadataDescription: metadata.description?.substring(0, 100) || null,
            scrapedContent: metadata.scrapedContent?.substring(0, 100) || null,
            usingScrapedContent: !metadata.description && !!metadata.scrapedContent,
            currentDescription: description.substring(0, 100),
            willSet: !description || description.trim() === '',
          })
          if (!description || description.trim() === '') {
            setDescription(descriptionToUse)
            finalDescription = descriptionToUse
          } else {
            finalDescription = description
          }
        } else {
          console.log('AddItemForm: No description in metadata (handleUrlChange)', {
            hasDescription: !!metadata.description,
            hasScrapedContent: !!metadata.scrapedContent,
            scrapedContentLength: metadata.scrapedContent?.length || 0,
          })
        }
        // Set image (always set if we have it and no screenshot)
        if (metadata.image && !screenshotUrl) {
          console.log('AddItemForm: Setting thumbnail from metadata (handleUrlChange)', {
            imageUrl: metadata.image.substring(0, 100),
            currentThumbnail: thumbnailUrl.substring(0, 100) || 'none',
          })
          setThumbnailUrl(metadata.image)
        } else {
          console.log('AddItemForm: No image in metadata or screenshot exists (handleUrlChange)', {
            hasImage: !!metadata.image,
            hasScreenshot: !!screenshotUrl,
          })
        }
      } else {
        // Ensure title is never empty
        if (!finalTitle) {
          finalTitle = generateHostnameTitle(newUrl)
          setTitle(finalTitle)
        }
      }

      // Try Google Places search after title is set (if not already done from Google Maps URL)
      if (finalTitle && finalTitle.trim() && newUrl && !mapsPlace.placeName && !mapsPlace.coordinates) {
        setTimeout(() => {
          searchPlaces(finalTitle)
        }, 1000)
      }

      // Trigger AI enrichment after metadata is loaded (non-blocking)
      console.log('AddItemForm: About to trigger AI enrichment from handleUrlChange', {
        url: newUrl,
        title: finalTitle,
        description: finalDescription,
        scrapedContent: metadata?.scrapedContent?.substring(0, 100),
        metadataFetched: metadataFetchedRef.current,
      })
      triggerAIEnrichment(newUrl, finalTitle || '', finalDescription || '', metadata?.scrapedContent || null)
      }
    }
  }

  // Track title edits
  const handleTitleChange = (newTitle: string) => {
    setTitle(newTitle)
    userEditedTitle.current = true
    
    // Clear AI title suggestion if user edits
    if (aiSuggestions?.title) {
      setAiSuggestions(prev => prev ? { ...prev, title: null } : null)
    }
    
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

  // Track description edits
  const handleDescriptionChange = (newDescription: string) => {
    setDescription(newDescription)
    userEditedDescription.current = true
  }

  // Accept AI title suggestion
  const handleAcceptAITitle = () => {
    if (aiSuggestions?.title && !userEditedTitle.current) {
      setTitle(aiSuggestions.title)
      userEditedTitle.current = true
      setAiSuggestions(prev => prev ? { ...prev, title: null } : null)
    }
  }

  // Accept AI location suggestion
  const handleAcceptAILocation = async () => {
    console.log('handleAcceptAILocation called', {
      hasPlaceName: !!aiSuggestions?.placeName,
      hasCity: !!aiSuggestions?.city,
      hasCountry: !!aiSuggestions?.country,
      userEditedLocation: userEditedLocation.current,
      hasSelectedPlace: !!selectedPlace,
    })

    if (!aiSuggestions) {
      console.log('handleAcceptAILocation: No AI suggestions available')
      return
    }

    // Check if user has already edited location or selected a place
    if (userEditedLocation.current || selectedPlace) {
      console.log('handleAcceptAILocation: User has already edited location or selected a place, skipping')
      return
    }

    if (aiSuggestions.placeName) {
      // Try to search for the place name
      console.log('handleAcceptAILocation: Searching for place:', aiSuggestions.placeName)
      try {
        const response = await fetch('/api/places', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: aiSuggestions.placeName }),
        })

        if (response.ok) {
          const data = await response.json()
          if (data.place) {
            const googlePlace = {
              place_name: data.place.name,
              place_id: data.place.place_id,
              latitude: data.place.geometry.location.lat,
              longitude: data.place.geometry.location.lng,
              formatted_address: data.place.formatted_address || '',
              city: aiSuggestions.city || data.city || null,
              country: aiSuggestions.country || data.country || null,
            }
            
            console.log('handleAcceptAILocation: Setting place from search:', googlePlace)
            setSelectedPlace(googlePlace)
            setLocationSearchValue(googlePlace.place_name)
            setLocationCity(googlePlace.city || '')
            setLocationCountry(googlePlace.country || '')
            userEditedLocation.current = true
            setAiSuggestions(prev => prev ? { ...prev, placeName: null, city: null, country: null } : null)
          } else {
            console.log('handleAcceptAILocation: No place found from search, falling back to city/country')
            // Fall through to city/country handling
            // If we have a placeName but no city, use placeName as city (e.g., "Cornwall" -> city)
            const cityToSet = aiSuggestions.city || (aiSuggestions.placeName ? aiSuggestions.placeName : null)
            if (cityToSet) {
              console.log('handleAcceptAILocation: Setting city:', cityToSet, { fromPlaceName: !aiSuggestions.city })
              setLocationCity(cityToSet)
            }
            if (aiSuggestions.country) {
              console.log('handleAcceptAILocation: Setting country:', aiSuggestions.country)
              setLocationCountry(aiSuggestions.country)
            }
            userEditedLocation.current = true
            setAiSuggestions(prev => prev ? { ...prev, placeName: null, city: null, country: null } : null)
          }
        } else {
          console.log('handleAcceptAILocation: Places API error, falling back to city/country')
          // Fall through to city/country handling
          // If we have a placeName but no city, use placeName as city
          const cityToSet = aiSuggestions.city || (aiSuggestions.placeName ? aiSuggestions.placeName : null)
          if (cityToSet) {
            console.log('handleAcceptAILocation: Setting city (API error):', cityToSet)
            setLocationCity(cityToSet)
          }
          if (aiSuggestions.country) {
            console.log('handleAcceptAILocation: Setting country (API error):', aiSuggestions.country)
            setLocationCountry(aiSuggestions.country)
          }
          userEditedLocation.current = true
          setAiSuggestions(prev => prev ? { ...prev, placeName: null, city: null, country: null } : null)
        }
      } catch (err) {
        console.error('Error accepting AI location:', err)
        // Fall through to city/country handling
        // If we have a placeName but no city, use placeName as city
        const cityToSet = aiSuggestions.city || (aiSuggestions.placeName ? aiSuggestions.placeName : null)
        if (cityToSet) {
          console.log('handleAcceptAILocation: Setting city (error):', cityToSet)
          setLocationCity(cityToSet)
        }
        if (aiSuggestions.country) {
          console.log('handleAcceptAILocation: Setting country (error):', aiSuggestions.country)
          setLocationCountry(aiSuggestions.country)
        }
        userEditedLocation.current = true
        setAiSuggestions(prev => prev ? { ...prev, placeName: null, city: null, country: null } : null)
      }
    } else if (aiSuggestions.city || aiSuggestions.country) {
      // If we have city/country but no place, just set those
      console.log('handleAcceptAILocation: Setting city/country only', {
        city: aiSuggestions.city,
        country: aiSuggestions.country,
      })
      if (aiSuggestions.city) setLocationCity(aiSuggestions.city)
      if (aiSuggestions.country) setLocationCountry(aiSuggestions.country)
      userEditedLocation.current = true
      setAiSuggestions(prev => prev ? { ...prev, city: null, country: null } : null)
    } else {
      console.log('handleAcceptAILocation: No location data to set')
    }
  }

  // Accept AI category suggestion
  const handleAcceptAICategory = () => {
    if (aiSuggestions?.category && !userEditedCategory.current && !categories.includes(aiSuggestions.category)) {
      setCategories([...categories, aiSuggestions.category])
      userEditedCategory.current = true
      setAiSuggestions(prev => prev ? { ...prev, category: null } : null)
    }
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
      // Combine all categories and statuses (including custom ones)
      const allCategories = [...categories]
      if (showCustomCategoryInput && customCategory.trim()) {
        allCategories.push(customCategory.trim())
      }
      
      const allStatuses = [...statuses]
      if (showCustomStatusInput && customStatus.trim()) {
        allStatuses.push(customStatus.trim())
      }

      // Save custom options if they were used
      allCategories.forEach(cat => {
        if (cat && !CATEGORIES.includes(cat as any) && !userCustomCategories.includes(cat)) {
          saveCustomOption('category', cat)
        }
      })
      allStatuses.forEach(stat => {
        if (stat && !STATUSES.includes(stat as any) && !userCustomStatuses.includes(stat)) {
          saveCustomOption('status', stat)
        }
      })

      // Convert to JSON strings for storage
      const finalCategory = allCategories.length > 0 ? JSON.stringify(allCategories) : null
      const finalStatus = allStatuses.length > 0 ? JSON.stringify(allStatuses) : null

      // Prepare location data
      const locationData = selectedPlace
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
          }

      console.log('AddItemForm: Saving item with location data:', {
        hasSelectedPlace: !!selectedPlace,
        selectedPlace: selectedPlace ? {
          place_name: selectedPlace.place_name,
          latitude: selectedPlace.latitude,
          longitude: selectedPlace.longitude,
          city: selectedPlace.city,
          country: selectedPlace.country,
        } : null,
        locationData,
        manualCity: locationCity,
        manualCountry: locationCountry,
      })

      // Insert into saved_items
      const insertPayload = {
        user_id: user.id,
        url: url.trim(),
        platform,
        title: finalTitle || null,
        description: description.trim() || null,
        notes: notes.trim() || null,
        thumbnail_url: thumbnailUrl || null,
        screenshot_url: screenshotUrl,
        ...locationData,
        category: finalCategory,
        status: finalStatus,
      }

      console.log('AddItemForm: Insert payload:', insertPayload)

      const { error: insertError, data: insertData } = await supabase
        .from('saved_items')
        .insert(insertPayload)
        .select()

      if (insertError) {
        console.error('AddItemForm: Database insert error:', insertError)
        throw insertError
      }

      console.log('AddItemForm: Item saved successfully:', insertData?.[0])
      if (insertData?.[0]) {
        console.log('AddItemForm: Saved item location data:', {
          latitude: insertData[0].latitude,
          longitude: insertData[0].longitude,
          place_name: insertData[0].place_name,
        })
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

            {/* Link Preview */}
            {url.trim() && (
              <div className="mb-6">
                <LinkPreview
                  url={url}
                  ogImage={thumbnailUrl}
                  screenshotUrl={screenshotUrl}
                />
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
              <div className="space-y-2">
                <input
                  id="title"
                  type="text"
                  value={title}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  placeholder="Enter a title"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                />
                {/* AI Title Suggestion */}
                {aiSuggestions?.title && !userEditedTitle.current && (
                  <div className="flex items-center gap-2 p-2 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex-1">
                      <p className="text-xs text-gray-600 mb-1">Suggested title</p>
                      <p className="text-sm text-gray-900">{aiSuggestions.title}</p>
                    </div>
                    <button
                      type="button"
                      onClick={handleAcceptAITitle}
                      className="px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700 transition-colors"
                    >
                      Use
                    </button>
                  </div>
                )}
                {aiLoading && !aiSuggestions && (
                  <p className="text-xs text-gray-500 italic">Thinking...</p>
                )}
              </div>
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
                onChange={(e) => handleDescriptionChange(e.target.value)}
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
            <div className="space-y-2">
              <GooglePlacesInput
                value={locationSearchValue}
                onChange={(place) => {
                  console.log('AddItemForm: Place onChange called:', place)
                  console.log('AddItemForm: Place data:', place ? {
                    place_name: place.place_name,
                    place_id: place.place_id,
                    latitude: place.latitude,
                    longitude: place.longitude,
                    city: place.city,
                    country: place.country,
                  } : null)
                  
                  setSelectedPlace(place)
                  if (place) {
                    setLocationSearchValue(place.place_name)
                    // Update city and country from place data (user can override after)
                    const cityValue = place.city || ''
                    const countryValue = place.country || ''
                    console.log('AddItemForm: Setting city/country from place:', { cityValue, countryValue })
                    setLocationCity(cityValue)
                    setLocationCountry(countryValue)
                    // Clear old place state
                    setPlaceName('')
                    setPlaceId('')
                    setLatitude(null)
                    setLongitude(null)
                    setIsLocationSuggested(false)
                    userEditedLocation.current = true
                    // Clear AI location suggestion if user selects a place
                    if (aiSuggestions?.placeName || aiSuggestions?.city || aiSuggestions?.country) {
                      setAiSuggestions(prev => prev ? { ...prev, placeName: null, city: null, country: null } : null)
                    }
                  } else {
                    setLocationSearchValue('')
                    setLocationCity('')
                    setLocationCountry('')
                  }
                }}
                onSearchValueChange={(value) => {
                  setLocationSearchValue(value)
                }}
                onManualCityChange={(city) => {
                  console.log('AddItemForm: onManualCityChange called with:', city)
                  setLocationCity(city)
                  userEditedLocation.current = true
                  // Clear AI location suggestion if user edits
                  if (aiSuggestions?.city) {
                    setAiSuggestions(prev => prev ? { ...prev, city: null } : null)
                  }
                }}
                onManualCountryChange={(country) => {
                  console.log('AddItemForm: onManualCountryChange called with:', country)
                  setLocationCountry(country)
                  userEditedLocation.current = true
                  // Clear AI location suggestion if user edits
                  if (aiSuggestions?.country) {
                    setAiSuggestions(prev => prev ? { ...prev, country: null } : null)
                  }
                }}
                manualCity={locationCity}
                manualCountry={locationCountry}
                id="location-search"
              />
              {/* AI Location Suggestion */}
              {(() => {
                const shouldShow = (aiSuggestions?.placeName || aiSuggestions?.city || aiSuggestions?.country) && !userEditedLocation.current && !selectedPlace
                if (aiSuggestions && (aiSuggestions.placeName || aiSuggestions.city || aiSuggestions.country)) {
                  console.log('AI location suggestion: Visibility check', {
                    hasPlaceName: !!aiSuggestions.placeName,
                    hasCity: !!aiSuggestions.city,
                    hasCountry: !!aiSuggestions.country,
                    userEditedLocation: userEditedLocation.current,
                    hasSelectedPlace: !!selectedPlace,
                    shouldShow,
                  })
                }
                return shouldShow && aiSuggestions
              })() && aiSuggestions && (
                <div className="flex items-center gap-2 p-2 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex-1">
                    <p className="text-xs text-gray-600 mb-1">Suggested location</p>
                    <p className="text-sm text-gray-900">
                      {aiSuggestions.placeName || [aiSuggestions.city, aiSuggestions.country].filter(Boolean).join(', ') || 'Location detected'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleAcceptAILocation}
                    className="px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700 transition-colors"
                  >
                    Use
                  </button>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Category
              </label>
              {/* AI Category Suggestion */}
              {aiSuggestions?.category && !userEditedCategory.current && !categories.includes(aiSuggestions.category) && (
                <div className="flex items-center gap-2 p-2 bg-blue-50 border border-blue-200 rounded-lg mb-2">
                  <div className="flex-1">
                    <p className="text-xs text-gray-600 mb-1">Suggested category</p>
                    <p className="text-sm text-gray-900">{aiSuggestions.category}</p>
                  </div>
                  <button
                    type="button"
                    onClick={handleAcceptAICategory}
                    className="px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700 transition-colors"
                  >
                    Use
                  </button>
                </div>
              )}
              <div className="flex flex-wrap gap-2 mb-2 overflow-x-auto max-h-[calc(3*2.5rem+0.5rem)]" style={{ scrollbarWidth: 'thin' }}>
                {CATEGORIES.map((cat) => {
                  const isSelected = categories.includes(cat)
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => {
                        if (isSelected) {
                          setCategories(categories.filter(c => c !== cat))
                        } else {
                          setCategories([...categories, cat])
                        }
                        userEditedCategory.current = true
                        setShowCustomCategoryInput(false)
                        setCustomCategory('')
                        // Clear AI category suggestion if user selects a category
                        if (aiSuggestions?.category) {
                          setAiSuggestions(prev => prev ? { ...prev, category: null } : null)
                        }
                      }}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                        isSelected
                          ? 'bg-gray-900 text-white'
                          : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {cat}
                    </button>
                  )
                })}
                {userCustomCategories.map((cat) => {
                  const isSelected = categories.includes(cat)
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => {
                        if (isSelected) {
                          setCategories(categories.filter(c => c !== cat))
                        } else {
                          setCategories([...categories, cat])
                        }
                        userEditedCategory.current = true
                        setShowCustomCategoryInput(false)
                        setCustomCategory('')
                        // Clear AI category suggestion if user selects a category
                        if (aiSuggestions?.category) {
                          setAiSuggestions(prev => prev ? { ...prev, category: null } : null)
                        }
                      }}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                        isSelected
                          ? 'bg-gray-900 text-white'
                          : 'bg-gray-100 text-gray-700 border border-gray-300 hover:bg-gray-200'
                      }`}
                    >
                      {cat}
                    </button>
                  )
                })}
                <button
                  type="button"
                  onClick={() => {
                    setShowCustomCategoryInput(!showCustomCategoryInput)
                    if (!showCustomCategoryInput) {
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
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={customCategory}
                    onChange={(e) => setCustomCategory(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        if (customCategory.trim()) {
                          setCategories([...categories, customCategory.trim()])
                          setCustomCategory('')
                          setShowCustomCategoryInput(false)
                        }
                      }
                    }}
                    placeholder="Enter custom category..."
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (customCategory.trim()) {
                        setCategories([...categories, customCategory.trim()])
                        setCustomCategory('')
                        setShowCustomCategoryInput(false)
                      }
                    }}
                    className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
                  >
                    Add
                  </button>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status
              </label>
              <div className="flex flex-wrap gap-2 mb-2 overflow-x-auto max-h-[calc(3*2.5rem+0.5rem)]" style={{ scrollbarWidth: 'thin' }}>
                {STATUSES.map((stat) => {
                  const isSelected = statuses.includes(stat)
                  return (
                    <button
                      key={stat}
                      type="button"
                      onClick={() => {
                        if (isSelected) {
                          setStatuses(statuses.filter(s => s !== stat))
                        } else {
                          setStatuses([...statuses, stat])
                        }
                        setShowCustomStatusInput(false)
                        setCustomStatus('')
                      }}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                        isSelected
                          ? 'bg-gray-900 text-white'
                          : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {stat}
                    </button>
                  )
                })}
                {userCustomStatuses.map((stat) => {
                  const isSelected = statuses.includes(stat)
                  return (
                    <button
                      key={stat}
                      type="button"
                      onClick={() => {
                        if (isSelected) {
                          setStatuses(statuses.filter(s => s !== stat))
                        } else {
                          setStatuses([...statuses, stat])
                        }
                        setShowCustomStatusInput(false)
                        setCustomStatus('')
                      }}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                        isSelected
                          ? 'bg-gray-900 text-white'
                          : 'bg-gray-100 text-gray-700 border border-gray-300 hover:bg-gray-200'
                      }`}
                    >
                      {stat}
                    </button>
                  )
                })}
                <button
                  type="button"
                  onClick={() => {
                    setShowCustomStatusInput(!showCustomStatusInput)
                    if (!showCustomStatusInput) {
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
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={customStatus}
                    onChange={(e) => setCustomStatus(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        if (customStatus.trim()) {
                          setStatuses([...statuses, customStatus.trim()])
                          setCustomStatus('')
                          setShowCustomStatusInput(false)
                        }
                      }
                    }}
                    placeholder="Enter custom status..."
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (customStatus.trim()) {
                        setStatuses([...statuses, customStatus.trim()])
                        setCustomStatus('')
                        setShowCustomStatusInput(false)
                      }
                    }}
                    className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
                  >
                    Add
                  </button>
                </div>
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
