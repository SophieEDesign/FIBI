'use client'

import { useEffect, useState, useRef, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { SavedItem, CATEGORIES, Itinerary } from '@/types/database'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { getHostname, uploadScreenshot, cleanOGTitle, generateHostnameTitle } from '@/lib/utils'
import GooglePlacesInput from '@/components/GooglePlacesInput'
import EmbedPreview from '@/components/EmbedPreview'

interface ItemDetailProps {
  itemId: string
}

export default function ItemDetail({ itemId }: ItemDetailProps) {
  const [item, setItem] = useState<SavedItem | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // Location is now always editable inline - no separate edit mode needed
  const [uploadingScreenshot, setUploadingScreenshot] = useState(false)
  
  // Editable fields (always editable)
  const [title, setTitle] = useState('')
  const [categories, setCategories] = useState<string[]>([])
  const [customCategory, setCustomCategory] = useState('')
  const [showCustomCategoryInput, setShowCustomCategoryInput] = useState(false)
  const [userCustomCategories, setUserCustomCategories] = useState<string[]>([])
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false)
  const [categorySearch, setCategorySearch] = useState('')
  const categoryDropdownRef = useRef<HTMLDivElement>(null)
  const [itineraries, setItineraries] = useState<Itinerary[]>([])
  const [selectedItineraryId, setSelectedItineraryId] = useState<string | null>(null)
  const [showCreateItinerary, setShowCreateItinerary] = useState(false)
  const [newItineraryName, setNewItineraryName] = useState('')
  const [creatingItinerary, setCreatingItinerary] = useState(false)
  const [organiseOpen, setOrganiseOpen] = useState(true)
  const [notesValue, setNotesValue] = useState('')
  
  // Location fields (edit mode only)
  const [description, setDescription] = useState('')
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
  const [refetchingMetadata, setRefetchingMetadata] = useState(false)
  const hasAutoRefetchedRef = useRef<string | null>(null)

  const supabase = createClient()
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  // Use ref to store selected place so it's always available when saving (React state is async)
  const selectedPlaceRef = useRef<{
    place_name: string
    place_id: string
    latitude: number
    longitude: number
    formatted_address: string
    city: string | null
    country: string | null
  } | null>(null)
  
  // Use ref to store handleSaveLocation so it's available in callbacks
  const handleSaveLocationRef = useRef<(() => Promise<void>) | undefined>(undefined)

  useEffect(() => {
    loadItem()
    loadUserCustomOptions()
    loadItineraries()
    hasAutoRefetchedRef.current = null
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemId])

  // When opening a place that has no title/description/thumbnail, auto re-fetch metadata so user can update
  useEffect(() => {
    if (!item?.url || loading || refetchingMetadata) return
    const missing = !(title || item.title)?.trim() || !(description || item.description)?.trim() || !item.thumbnail_url
    if (!missing) return
    if (hasAutoRefetchedRef.current === item.id) return
    hasAutoRefetchedRef.current = item.id
    refetchMetadataAndUpdate()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item?.id, item?.url, item?.title, item?.description, item?.thumbnail_url, title, description, loading, refetchingMetadata])

  // Handle click outside dropdowns
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (categoryDropdownRef.current && !categoryDropdownRef.current.contains(event.target as Node)) {
        setShowCategoryDropdown(false)
      }
    }

    if (showCategoryDropdown) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showCategoryDropdown])

  // Load itineraries
  const loadItineraries = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) return

      const { data, error } = await supabase
        .from('itineraries')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error loading itineraries:', error)
        setItineraries([])
      } else {
        setItineraries(data || [])
      }
    } catch (err) {
      console.error('Error loading itineraries:', err)
      setItineraries([])
    }
  }

  // Load user's custom categories
  const loadUserCustomOptions = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) return

      const { data: categories, error: catError } = await supabase
        .from('user_custom_options')
        .select('value')
        .eq('user_id', user.id)
        .eq('type', 'category')
        .order('created_at', { ascending: false })

      if (catError) console.error('Error loading custom categories:', catError)
      if (categories) {
        setUserCustomCategories(categories.map(c => c.value))
      }
    } catch (err) {
      console.error('Error loading custom options:', err)
    }
  }

  // Save custom option to database
  const saveCustomOption = async (type: 'category', value: string) => {
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
        loadUserCustomOptions()
      }
    } catch (err) {
      console.error('Error saving custom option:', err)
    }
  }

  const loadItem = async () => {
    try {
      const { data, error } = await supabase
        .from('saved_items')
        .select('*')
        .eq('id', itemId)
        .single()

      if (error) throw error
      
      if (data) {
        setItem(data)
        setTitle(data.title || '')
        setDescription(data.description || '')
        setLocationCountry(data.location_country || '')
        setLocationCity(data.location_city || '')
        // Load Google Place data if available
        // Check if we have coordinates (latitude and longitude are the key indicators)
        // We can have coordinates without place_name/place_id (if manually entered), so check coordinates first
        const hasCoordinates = data.latitude != null && data.longitude != null
        
        console.log('ItemDetail: Loading item location data:', {
          hasCoordinates,
          latitude: data.latitude,
          longitude: data.longitude,
          place_name: data.place_name,
          place_id: data.place_id,
          location_city: data.location_city,
          location_country: data.location_country,
        })
        
        if (hasCoordinates) {
          // Ensure coordinates are numbers
          const lat = typeof data.latitude === 'number' ? data.latitude : parseFloat(String(data.latitude))
          const lng = typeof data.longitude === 'number' ? data.longitude : parseFloat(String(data.longitude))
          
          if (!isNaN(lat) && !isNaN(lng)) {
            // Create place data - use place_name if available, otherwise use formatted_address or location
            const placeName = data.place_name || data.formatted_address || 
              (data.location_city && data.location_country 
                ? `${data.location_city}, ${data.location_country}` 
                : data.location_city || data.location_country || '')
            
            const placeData = {
              place_name: placeName,
              place_id: data.place_id || '',
              latitude: lat,
              longitude: lng,
              formatted_address: data.formatted_address || '',
              city: data.location_city,
              country: data.location_country,
            }
            console.log('ItemDetail: Setting selected place from saved data:', placeData)
            setSelectedPlace(placeData)
            selectedPlaceRef.current = placeData
            setLocationSearchValue(placeName)
          } else {
            console.warn('ItemDetail: Invalid coordinates, clearing place:', { lat, lng })
            setSelectedPlace(null)
            selectedPlaceRef.current = null
            setLocationSearchValue('')
          }
        } else {
          console.log('ItemDetail: No coordinates found, clearing place data')
          setSelectedPlace(null)
          selectedPlaceRef.current = null
          // If we have city/country but no coordinates, show them in manual fields only
          setLocationSearchValue('')
        }
        // Parse categories (support both single values and arrays)
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
        
        setCategories(parseCategories(data.category))
        setSelectedItineraryId(data.itinerary_id || null)
        setNotesValue(data.notes ?? '')
        setCustomCategory('')
        setShowCustomCategoryInput(false)
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load item')
    } finally {
      setLoading(false)
    }
  }

  // Re-fetch metadata from the item URL and update empty title/description/thumbnail so user can update posts that didn't pull through
  const refetchMetadataAndUpdate = useCallback(async () => {
    if (!item?.url?.trim()) return
    setRefetchingMetadata(true)
    setError(null)
    try {
      const response = await fetch('/api/metadata', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: item.url }),
      })
      if (!response.ok) throw new Error('Failed to fetch preview')
      const metadata = await response.json()
      const updates: { title?: string | null; description?: string | null; thumbnail_url?: string | null } = {}
      const currentTitle = (title || item?.title || '').trim()
      const currentDescription = (description || item?.description || '').trim()
      const currentThumbnail = item?.thumbnail_url

      if (!currentTitle && (metadata.title || metadata.scrapedContent)) {
        const cleaned = cleanOGTitle(metadata.title)
        const newTitle = cleaned || (metadata.scrapedContent?.substring(0, 80)?.trim() || null) || generateHostnameTitle(item.url)
        updates.title = newTitle
        setTitle(newTitle)
        await saveField('title', newTitle)
      }
      if (!currentDescription && (metadata.description || metadata.scrapedContent)) {
        const newDesc = (metadata.description || metadata.scrapedContent?.substring(0, 500)?.trim() || null) ?? null
        if (newDesc) {
          updates.description = newDesc
          setDescription(newDesc)
          await saveField('description', newDesc)
        }
      }
      if (!currentThumbnail && metadata.image) {
        updates.thumbnail_url = metadata.image
        setItem(prev => prev ? { ...prev, thumbnail_url: metadata.image } : null)
        await saveField('thumbnail_url', metadata.image)
      }
      if (Object.keys(updates).length > 0 && item) {
        setItem(prev => prev ? { ...prev, ...updates } : null)
      }
    } catch (err: any) {
      console.debug('ItemDetail: Metadata refetch failed (non-blocking):', err)
      setError(err?.message || 'Could not fetch preview. Try again or add details manually.')
    } finally {
      setRefetchingMetadata(false)
    }
  }, [item, title, description])

  // Save a single field to Supabase
  const saveField = async (fieldName: string, value: string | null | boolean) => {
    try {
      const { error: updateError } = await supabase
        .from('saved_items')
        .update({ [fieldName]: value })
        .eq('id', itemId)

      if (updateError) throw updateError

      // Update local item state optimistically
      if (item) {
        setItem({ ...item, [fieldName]: value })
      }
    } catch (err: any) {
      setError(err.message || `Failed to save ${fieldName}`)
      // Reload to get correct state
      loadItem()
    }
  }

  // Save categories array
  const saveCategories = async (cats: string[]) => {
    const value = cats.length > 0 ? JSON.stringify(cats) : null
    await saveField('category', value)
  }

  // Handle itinerary change
  const handleItineraryChange = async (itineraryId: string | null) => {
    setSelectedItineraryId(itineraryId)
    if (!item) return
    let tripPosition: number | null = null
    if (itineraryId) {
      const { data: maxRow } = await supabase
        .from('saved_items')
        .select('trip_position')
        .eq('itinerary_id', itineraryId)
        .order('trip_position', { ascending: false })
        .limit(1)
        .maybeSingle()
      tripPosition = maxRow?.trip_position != null ? maxRow.trip_position + 1 : 0
    }
    const { error } = await supabase
      .from('saved_items')
      .update({ itinerary_id: itineraryId, trip_position: tripPosition })
      .eq('id', item.id)
    if (error) {
      console.error('Error updating trip:', error)
      return
    }
    loadItem()
  }

  // Handle create new trip
  const handleCreateItinerary = async () => {
    if (!newItineraryName.trim()) return
    setCreatingItinerary(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data, error } = await supabase
        .from('itineraries')
        .insert({ user_id: user.id, name: newItineraryName.trim() })
        .select()
        .single()
      if (error) throw error
      if (data) {
        setItineraries((prev) => [data, ...prev])
        setSelectedItineraryId(data.id)
        setShowCreateItinerary(false)
        setNewItineraryName('')
        await handleItineraryChange(data.id)
      }
    } catch (err) {
      console.error('Error creating trip:', err)
      alert('Failed to create trip. Please try again.')
    } finally {
      setCreatingItinerary(false)
    }
  }

  // Handle notes save (debounced on blur)
  const handleNotesBlur = async () => {
    if (!item || notesValue === (item.notes ?? '')) return
    await saveField('notes', notesValue.trim() || null)
    if (item) setItem({ ...item, notes: notesValue.trim() || null })
  }

  // Handle title save on blur
  const handleTitleBlur = async () => {
    const trimmedTitle = title.trim() || null
    if (trimmedTitle !== (item?.title || null)) {
      await saveField('title', trimmedTitle)
    }
  }

  // Handle category toggle (add/remove from array)
  const handleCategoryToggle = async (category: string) => {
    const newCategories = categories.includes(category)
      ? categories.filter(c => c !== category)
      : [...categories, category]
    
    setCategories(newCategories)
    
    // Save custom option if it was used
    if (category && !CATEGORIES.includes(category as any) && !userCustomCategories.includes(category)) {
      await saveCustomOption('category', category)
    }
    
    await saveCategories(newCategories)
  }

  // Handle custom category save
  const handleCustomCategorySave = async () => {
    if (!customCategory.trim()) return
    
    const finalCategory = customCategory.trim()
    const newCategories = [...categories, finalCategory]
    setCategories(newCategories)
    setShowCustomCategoryInput(false)
    
    // Save custom option
    await saveCustomOption('category', finalCategory)
    
    // Save to item
    await saveCategories(newCategories)
    setCustomCategory('')
  }
  
  // Handle screenshot upload
  const handleScreenshotUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !item) return

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

      const uploadedUrl = await uploadScreenshot(file, user.id, item.id, supabase)

      if (!uploadedUrl) {
        setError('Failed to upload screenshot. Please try again.')
        return
      }

      // Save screenshot URL to database
      await saveField('screenshot_url', uploadedUrl)
    } catch (err: any) {
      // Check if it's a bucket error
      const errorMessage = err?.message || 'Failed to upload screenshot'
      if (errorMessage.includes('Bucket not found') || errorMessage.includes('not found') || errorMessage.includes('Storage bucket')) {
        setError('Storage bucket "screenshots" not found. Please create it in your Supabase dashboard under Storage.')
      } else {
        setError(errorMessage || 'Failed to upload screenshot. Please try again.')
      }
    } finally {
      setUploadingScreenshot(false)
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  // Handle screenshot removal
  const handleRemoveScreenshot = async () => {
    if (!item || !item.screenshot_url) return

    if (!confirm('Remove your screenshot? The preview will revert to the original image or placeholder.')) {
      return
    }

    try {
      // Extract path from public URL
      // URL format: https://[project].supabase.co/storage/v1/object/public/screenshots/userId/filename
      const urlParts = item.screenshot_url.split('/screenshots/')
      if (urlParts.length > 1) {
        const screenshotPath = urlParts[1] // userId/filename
        
        // Delete from storage
        const { error: deleteError } = await supabase.storage
          .from('screenshots')
          .remove([screenshotPath])

        if (deleteError) {
          console.error('Error deleting screenshot from storage:', deleteError)
          // Continue anyway to remove from database
        }
      }

      // Remove from database
      await saveField('screenshot_url', null)
    } catch (err: any) {
      setError(err.message || 'Failed to remove screenshot')
    }
  }

  // Memoized callbacks for GooglePlacesInput to prevent listener recreation
  const handlePlaceChange = useCallback((place: {
    place_name: string
    place_id: string
    latitude: number
    longitude: number
    formatted_address: string
    city: string | null
    country: string | null
  } | null) => {
    console.log('ItemDetail: Place onChange called:', place)
    console.log('ItemDetail: Place data:', place ? {
      place_name: place.place_name,
      place_id: place.place_id,
      latitude: place.latitude,
      longitude: place.longitude,
      city: place.city,
      country: place.country,
    } : null)
    
    // CRITICAL: Update ref FIRST (synchronously) before state updates
    // This ensures handleSaveLocation has access to the place data
    selectedPlaceRef.current = place
    
    // Then update state (async)
    setSelectedPlace(place)
    
    if (place) {
      setLocationSearchValue(place.place_name)
      // Update city and country from place data (user can override after)
      const cityValue = place.city || ''
      const countryValue = place.country || ''
      console.log('ItemDetail: Setting city/country from place:', { cityValue, countryValue })
      setLocationCity(cityValue)
      setLocationCountry(countryValue)
      
      // Auto-save when place is selected
      // Use a longer timeout to ensure all state updates have propagated
      setTimeout(() => {
        console.log('ItemDetail: Auto-saving location after place selection:', {
          selectedPlace: place,
          selectedPlaceRef: selectedPlaceRef.current,
          locationCity: cityValue,
          locationCountry: countryValue,
        })
        // Use ref to call handleSaveLocation
        if (handleSaveLocationRef.current) {
          handleSaveLocationRef.current()
        }
      }, 300)
    } else {
      selectedPlaceRef.current = null
      setLocationSearchValue('')
      setLocationCity('')
      setLocationCountry('')
    }
  }, []) // Empty deps - we use refs and setters which are stable

  const handleManualCityChange = useCallback((city: string) => {
    console.log('ItemDetail: onManualCityChange called with:', city)
    setLocationCity(city)
    // Allow manual override - don't clear selectedPlace
    // User can override city/country while keeping the place coordinates
  }, [])

  const handleManualCountryChange = useCallback((country: string) => {
    console.log('ItemDetail: onManualCountryChange called with:', country)
    setLocationCountry(country)
    // Allow manual override - don't clear selectedPlace
    // User can override city/country while keeping the place coordinates
  }, [])

  const handleSearchValueChange = useCallback((value: string) => {
    setLocationSearchValue(value)
  }, [])

  // Save location fields (when in edit mode)
  const handleSaveLocation = useCallback(async () => {
    setSaving(true)
    setError(null)

    try {
      // CRITICAL: Always use ref first - it's updated synchronously when place is selected
      // The ref is set immediately in onChange, while state updates are async
      // This ensures we always have the most recent place data when saving
      const currentSelectedPlace = selectedPlaceRef.current
      const currentLocationCity = locationCity
      const currentLocationCountry = locationCountry
      
      console.log('ItemDetail: handleSaveLocation called with state:', {
        selectedPlace: selectedPlace,
        selectedPlaceRef: selectedPlaceRef.current,
        currentSelectedPlace: currentSelectedPlace,
        locationCity: currentLocationCity,
        locationCountry: currentLocationCountry,
      })

      // Determine location data: use Google Place if selected, otherwise use manual entry
      // If place is selected, use place data but allow manual city/country to override
      // IMPORTANT: Ensure coordinates are numbers, not strings
      // If no place is selected AND city/country are empty, clear everything
      const locationData: {
        place_name: string | null
        place_id: string | null
        latitude: number | null
        longitude: number | null
        formatted_address: string | null
        location_city: string | null
        location_country: string | null
      } = currentSelectedPlace
        ? {
            place_name: currentSelectedPlace.place_name,
            place_id: currentSelectedPlace.place_id,
            latitude: typeof currentSelectedPlace.latitude === 'number' 
              ? currentSelectedPlace.latitude 
              : parseFloat(String(currentSelectedPlace.latitude)),
            longitude: typeof currentSelectedPlace.longitude === 'number' 
              ? currentSelectedPlace.longitude 
              : parseFloat(String(currentSelectedPlace.longitude)),
            formatted_address: currentSelectedPlace.formatted_address,
            // Use manual city/country if provided, otherwise use place data
            location_city: currentLocationCity.trim() || currentSelectedPlace.city || null,
            location_country: currentLocationCountry.trim() || currentSelectedPlace.country || null,
          }
        : {
            // No place selected - clear all location data if city/country are also empty
            place_name: null,
            place_id: null,
            latitude: null,
            longitude: null,
            formatted_address: null,
            // Only keep city/country if they have values (manual entry without place)
            location_city: currentLocationCity.trim() || null,
            location_country: currentLocationCountry.trim() || null,
          }
      
      // Validate coordinates before saving
      if (locationData.latitude !== null && (isNaN(locationData.latitude) || locationData.latitude < -90 || locationData.latitude > 90)) {
        console.error('ItemDetail: Invalid latitude:', locationData.latitude)
        locationData.latitude = null
      }
      if (locationData.longitude !== null && (isNaN(locationData.longitude) || locationData.longitude < -180 || locationData.longitude > 180)) {
        console.error('ItemDetail: Invalid longitude:', locationData.longitude)
        locationData.longitude = null
      }

      console.log('ItemDetail: Saving location data:', {
        hasSelectedPlace: !!currentSelectedPlace,
        selectedPlace: currentSelectedPlace ? {
          place_name: currentSelectedPlace.place_name,
          place_id: currentSelectedPlace.place_id,
          latitude: currentSelectedPlace.latitude,
          longitude: currentSelectedPlace.longitude,
          city: currentSelectedPlace.city,
          country: currentSelectedPlace.country,
          formatted_address: currentSelectedPlace.formatted_address,
        } : null,
        locationData: JSON.parse(JSON.stringify(locationData)), // Deep clone to show full object
        manualCity: currentLocationCity,
        manualCountry: currentLocationCountry,
      })

      const updatePayload = {
        description: description.trim() || null,
        ...locationData,
      }

      console.log('ItemDetail: Update payload (full):', JSON.parse(JSON.stringify(updatePayload)))
      console.log('ItemDetail: Update payload latitude:', updatePayload.latitude)
      console.log('ItemDetail: Update payload longitude:', updatePayload.longitude)
      console.log('ItemDetail: Update payload place_name:', updatePayload.place_name)

      const { error: updateError, data: updateData } = await supabase
        .from('saved_items')
        .update(updatePayload)
        .eq('id', itemId)
        .select()

      if (updateError) {
        console.error('ItemDetail: Update error:', updateError)
        throw updateError
      }

      console.log('ItemDetail: Location saved successfully:', updateData?.[0])
      if (updateData?.[0]) {
        console.log('ItemDetail: Saved location data:', {
          latitude: updateData[0].latitude,
          longitude: updateData[0].longitude,
          place_name: updateData[0].place_name,
          location_city: updateData[0].location_city,
          location_country: updateData[0].location_country,
        })
      }

      // Reload item to reflect changes
      loadItem()
    } catch (err: any) {
      console.error('ItemDetail: Error saving location:', err)
      setError(err.message || 'Failed to save location')
    } finally {
      setSaving(false)
    }
  }, [locationCity, locationCountry, description, itemId, supabase, loadItem])
  
  // Update ref whenever handleSaveLocation changes
  useEffect(() => {
    handleSaveLocationRef.current = handleSaveLocation
  }, [handleSaveLocation])

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this item?')) return

    try {
      const { error } = await supabase
        .from('saved_items')
        .delete()
        .eq('id', itemId)

      if (error) throw error

      router.push('/app')
      router.refresh()
    } catch (err: any) {
      setError(err.message || 'Failed to delete item')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    )
  }

  if (!item) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Item not found</p>
          <Link href="/app" className="text-gray-900 font-medium hover:underline">
            ← Back to home
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white md:hidden shadow-soft">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <Link href="/app" className="text-2xl font-bold text-[#1f2937]">
              FiBi
            </Link>
            <Link
              href="/app"
              className="text-[#6b7280] hover:text-[#1f2937] text-sm font-medium"
            >
              ← Back
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-2xl shadow-soft overflow-hidden">
          {/* Preview area */}
          <div className="aspect-video bg-gray-100 relative overflow-hidden">
            {/* Preview priority: screenshot_url > embed preview (oEmbed/OG thumbnail) > placeholder */}
            {item.screenshot_url ? (
              // Show screenshot if uploaded
              <>
                <img
                  src={item.screenshot_url}
                  alt={title || item.title || getHostname(item.url)}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
                <div className="absolute top-4 left-4 px-2 py-1 bg-black/70 text-white text-xs rounded">
                  Your screenshot
                </div>
                <div className="hidden w-full h-full items-center justify-center bg-gray-50">
                  <div className="text-center">
                    <div className="text-gray-400 text-5xl mb-3">
                      {item.platform === 'TikTok' ? '🎵' : item.platform === 'Instagram' ? '📷' : item.platform === 'YouTube' ? '▶️' : '🔗'}
                    </div>
                    <p className="text-sm text-gray-500 px-4">Preview unavailable</p>
                  </div>
                </div>
              </>
            ) : item.thumbnail_url ? (
              // Show embed preview (oEmbed thumbnail or OG thumbnail) if no screenshot but has thumbnail
              <>
                <EmbedPreview
                  url={item.url}
                  thumbnailUrl={item.thumbnail_url}
                  platform={item.platform}
                  displayTitle={title || item.title || getHostname(item.url)}
                />
                <div className="hidden w-full h-full items-center justify-center bg-gray-50">
                  <div className="text-center">
                    <div className="text-gray-400 text-5xl mb-3">
                      {item.platform === 'TikTok' ? '🎵' : item.platform === 'Instagram' ? '📷' : item.platform === 'YouTube' ? '▶️' : '🔗'}
                    </div>
                    <p className="text-sm text-gray-500 px-4">Preview unavailable</p>
                  </div>
                </div>
              </>
            ) : (
              // Show placeholder if no screenshot and no thumbnail (oEmbed will try to fetch)
              <>
                {/* Placeholder - positioned absolutely so image can overlay it */}
                <div className="absolute inset-0 w-full h-full flex items-center justify-center bg-gray-50">
                  <div className="text-center">
                    <div className="text-gray-400 text-5xl mb-3">
                      {item.platform === 'TikTok' ? '🎵' : item.platform === 'Instagram' ? '📷' : item.platform === 'YouTube' ? '▶️' : '🔗'}
                    </div>
                    <p className="text-sm text-gray-500 px-4">Preview unavailable</p>
                  </div>
                </div>
                {/* EmbedPreview - will overlay placeholder if image loads */}
                <div className="relative w-full h-full">
                  <EmbedPreview
                    url={item.url}
                    thumbnailUrl={null}
                    platform={item.platform}
                    displayTitle={title || item.title || getHostname(item.url)}
                  />
                </div>
              </>
            )}
            
            {/* Platform badge - top right */}
            <div className={`absolute top-4 right-4 px-3 py-1.5 rounded-lg text-sm font-medium ${
              item.platform === 'TikTok' ? 'bg-black text-white' :
              item.platform === 'Instagram' ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white' :
              item.platform === 'YouTube' ? 'bg-red-600 text-white' :
              'bg-gray-700 text-white'
            }`}>
              {item.platform}
            </div>

            {/* Screenshot management + Refetch preview */}
            <div className="absolute bottom-4 right-4 flex flex-wrap gap-2 items-center justify-end">
              <button
                type="button"
                onClick={() => refetchMetadataAndUpdate()}
                disabled={refetchingMetadata}
                className="px-3 py-1.5 bg-black/70 text-white text-sm rounded hover:bg-black/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {refetchingMetadata ? 'Fetching…' : 'Refetch preview'}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/webp"
                onChange={handleScreenshotUpload}
                className="hidden"
                id="screenshot-upload-detail"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingScreenshot}
                className="px-3 py-1.5 bg-black/70 text-white text-sm rounded hover:bg-black/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {uploadingScreenshot ? 'Uploading...' : item.screenshot_url ? 'Replace' : 'Add screenshot'}
              </button>
              {item.screenshot_url && (
                <button
                  type="button"
                  onClick={handleRemoveScreenshot}
                  className="px-3 py-1.5 bg-red-600/90 text-white text-sm rounded hover:bg-red-600 transition-colors"
                >
                  Remove
                </button>
              )}
            </div>
          </div>

          <div className="p-8">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm mb-6">
                {error}
              </div>
            )}

            <div className="mb-6">
              {/* Title + Location */}
              <div className="mb-4">
                <label className="block text-xs font-medium text-gray-500 mb-1">Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  onBlur={handleTitleBlur}
                  className="w-full text-2xl font-bold text-gray-900 px-0 py-2 border-0 border-b-2 border-transparent focus:border-gray-300 focus:outline-none transition-colors"
                  placeholder="Add a title..."
                  required
                />
              </div>

              {/* Location - grouped with Title per spec */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">Location</label>
                <GooglePlacesInput
                  value={locationSearchValue}
                  onChange={handlePlaceChange}
                  onSearchValueChange={handleSearchValueChange}
                  onManualCityChange={handleManualCityChange}
                  onManualCountryChange={handleManualCountryChange}
                  onManualCityBlur={handleSaveLocation}
                  onManualCountryBlur={handleSaveLocation}
                  manualCity={locationCity}
                  manualCountry={locationCountry}
                  id="location-search-edit"
                />
                {(selectedPlace || locationCity || locationCountry) && (
                  <div className="mt-2 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleSaveLocation}
                      disabled={saving}
                      className="text-sm text-gray-600 hover:text-gray-900 font-medium disabled:opacity-50"
                    >
                      {saving ? 'Saving...' : 'Save location'}
                    </button>
                    <span className="text-gray-300">•</span>
                    <button
                      type="button"
                      onClick={async () => {
                        setSaving(true)
                        setError(null)
                        try {
                          const { error: updateError } = await supabase
                            .from('saved_items')
                            .update({
                              place_name: null,
                              place_id: null,
                              latitude: null,
                              longitude: null,
                              formatted_address: null,
                              location_city: null,
                              location_country: null,
                            })
                            .eq('id', itemId)
                          if (updateError) throw updateError
                          selectedPlaceRef.current = null
                          setSelectedPlace(null)
                          setLocationSearchValue('')
                          setLocationCity('')
                          setLocationCountry('')
                          loadItem()
                        } catch (err: any) {
                          setError(err.message || 'Failed to remove location')
                        } finally {
                          setSaving(false)
                        }
                      }}
                      disabled={saving}
                      className="text-sm text-red-600 hover:text-red-800 font-medium disabled:opacity-50"
                    >
                      {saving ? 'Removing...' : 'Remove location'}
                    </button>
                  </div>
                )}
              </div>

              <div className="space-y-4">
                {/* Trip selector */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Trip</label>
                  <select
                    value={selectedItineraryId || ''}
                    onChange={(e) => handleItineraryChange(e.target.value || null)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent bg-white"
                  >
                    <option value="">No trip</option>
                    {itineraries.map((itinerary) => (
                      <option key={itinerary.id} value={itinerary.id}>
                        {itinerary.name}
                      </option>
                    ))}
                  </select>
                  {!showCreateItinerary ? (
                    <button
                      type="button"
                      onClick={() => setShowCreateItinerary(true)}
                      className="mt-2 w-full px-4 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      + Create new trip
                    </button>
                  ) : (
                    <div className="mt-2 space-y-2">
                      <input
                        type="text"
                        value={newItineraryName}
                        onChange={(e) => setNewItineraryName(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && newItineraryName.trim() && handleCreateItinerary()}
                        placeholder="Trip name"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                        autoFocus
                      />
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={handleCreateItinerary}
                          disabled={!newItineraryName.trim() || creatingItinerary}
                          className="flex-1 px-4 py-2 text-sm font-medium bg-gray-900 text-white rounded-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {creatingItinerary ? 'Creating...' : 'Create'}
                        </button>
                        <button
                          type="button"
                          onClick={() => { setShowCreateItinerary(false); setNewItineraryName('') }}
                          className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Collapsible Organise (Category, Stage) */}
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setOrganiseOpen(!organiseOpen)}
                    className="w-full px-4 py-3 flex items-center justify-between text-sm font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 transition-colors"
                  >
                    <span>Organise</span>
                    <svg className={`w-4 h-4 text-gray-500 transition-transform ${organiseOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {organiseOpen && (
                    <div className="p-4 space-y-4 bg-white border-t border-gray-200">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                  {/* Mobile Dropdown */}
                  <div className="md:hidden relative mb-2" ref={categoryDropdownRef}>
                    <button
                      type="button"
                      onClick={() => {
                        setShowCategoryDropdown(!showCategoryDropdown)
                      }}
                      className="w-full flex items-center justify-between px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <span>
                        {categories.length > 0 
                          ? `${categories.length} selected` 
                          : 'Select category'}
                      </span>
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
                      <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-40 max-h-64 overflow-y-auto">
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
                        <div className="p-2">
                          {[...CATEGORIES, ...userCustomCategories]
                            .filter((cat) => 
                              cat.toLowerCase().includes(categorySearch.toLowerCase())
                            )
                            .map((cat) => {
                              const isSelected = categories.includes(cat)
                              return (
                                <button
                                  key={cat}
                                  type="button"
                                  onClick={() => {
                                    handleCategoryToggle(cat)
                                    setShowCustomCategoryInput(false)
                                    setCustomCategory('')
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
                                  {cat}
                                </button>
                              )
                            })}
                          <button
                            type="button"
                            onClick={() => {
                              setShowCustomCategoryInput(!showCustomCategoryInput)
                              setShowCategoryDropdown(false)
                              if (!showCustomCategoryInput) {
                                setCustomCategory('')
                              }
                            }}
                            className="w-full text-left px-3 py-2 text-sm rounded-md transition-colors hover:bg-gray-100 text-gray-700 flex items-center gap-2"
                          >
                            <span className="text-lg">+</span>
                            Custom
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Desktop Buttons */}
                  <div className="hidden md:flex md:flex-wrap md:gap-2 mb-2 overflow-x-auto max-h-[calc(3*2.5rem+0.5rem)]" style={{ scrollbarWidth: 'thin' }}>
                    {CATEGORIES.map((cat) => {
                      const isSelected = categories.includes(cat)
                      return (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => {
                            handleCategoryToggle(cat)
                            setShowCustomCategoryInput(false)
                            setCustomCategory('')
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
                            handleCategoryToggle(cat)
                            setShowCustomCategoryInput(false)
                            setCustomCategory('')
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
                            handleCustomCategorySave()
                          }
                        }}
                        placeholder="Enter custom category..."
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                      />
                      <button
                        type="button"
                        onClick={handleCustomCategorySave}
                        className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
                      >
                        Save
                      </button>
                    </div>
                  )}
                </div>
              </div>
                  )}
            </div>
                </div>
              </div>

            <div className="space-y-6">

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
              <textarea
                value={notesValue}
                onChange={(e) => setNotesValue(e.target.value)}
                onBlur={handleNotesBlur}
                rows={4}
                placeholder="Add personal notes..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-gray-900 focus:border-transparent resize-none text-gray-900 bg-white"
              />
            </div>

            {/* Original link + Delete (subtle) */}
            <div className="mt-6 pt-6 border-t border-gray-100 flex flex-wrap items-center gap-3">
              <a
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
                Open original link
              </a>
              <span className="text-gray-300">·</span>
              <button
                onClick={handleDelete}
                className="text-sm text-red-600 hover:text-red-800"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
        </div>
      </main>

    </div>
  )
}
