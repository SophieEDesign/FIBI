'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { SavedItem, CATEGORIES, STATUSES } from '@/types/database'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { getHostname, uploadScreenshot } from '@/lib/utils'
import GooglePlacesInput from '@/components/GooglePlacesInput'

interface ItemDetailProps {
  itemId: string
}

export default function ItemDetail({ itemId }: ItemDetailProps) {
  const [item, setItem] = useState<SavedItem | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isEditingLocation, setIsEditingLocation] = useState(false)
  const [uploadingScreenshot, setUploadingScreenshot] = useState(false)
  
  // Editable fields (always editable)
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState('')
  const [customCategory, setCustomCategory] = useState('')
  const [showCustomCategoryInput, setShowCustomCategoryInput] = useState(false)
  const [status, setStatus] = useState('')
  const [customStatus, setCustomStatus] = useState('')
  const [showCustomStatusInput, setShowCustomStatusInput] = useState(false)
  const [userCustomCategories, setUserCustomCategories] = useState<string[]>([])
  const [userCustomStatuses, setUserCustomStatuses] = useState<string[]>([])
  const [notes, setNotes] = useState('')
  
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

  const supabase = createClient()
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    loadItem()
    loadUserCustomOptions()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemId])

  // Load user's custom categories and statuses
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
        if (data.place_name && data.place_id && data.latitude && data.longitude) {
          setSelectedPlace({
            place_name: data.place_name,
            place_id: data.place_id,
            latitude: data.latitude,
            longitude: data.longitude,
            formatted_address: data.formatted_address || '',
            city: data.location_city,
            country: data.location_country,
          })
          setLocationSearchValue(data.place_name)
        } else {
          setSelectedPlace(null)
          setLocationSearchValue('')
        }
        // Check if category/status is a custom one (not in predefined lists)
        const isCustomCategory = data.category && !CATEGORIES.includes(data.category as any)
        const isCustomStatus = data.status && !STATUSES.includes(data.status as any)
        if (isCustomCategory) {
          setCustomCategory(data.category)
          setShowCustomCategoryInput(true)
          setCategory('')
        } else {
          setCategory(data.category || '')
          setCustomCategory('')
          setShowCustomCategoryInput(false)
        }
        if (isCustomStatus) {
          setCustomStatus(data.status)
          setShowCustomStatusInput(true)
          setStatus('')
        } else {
          setStatus(data.status || '')
          setCustomStatus('')
          setShowCustomStatusInput(false)
        }
        setNotes(data.notes || '')
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load item')
    } finally {
      setLoading(false)
    }
  }

  // Save a single field to Supabase
  const saveField = async (fieldName: string, value: string | null) => {
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

  // Handle title save on blur
  const handleTitleBlur = async () => {
    const trimmedTitle = title.trim() || null
    if (trimmedTitle !== (item?.title || null)) {
      await saveField('title', trimmedTitle)
    }
  }

  // Handle category change
  const handleCategoryChange = async (newCategory: string) => {
    setCategory(newCategory)
    setShowCustomCategoryInput(false)
    setCustomCategory('')
    
    const value = newCategory || null
    
    // Save custom option if it was used
    if (newCategory && !CATEGORIES.includes(newCategory as any) && !userCustomCategories.includes(newCategory)) {
      await saveCustomOption('category', newCategory)
    }
    
    await saveField('category', value)
  }

  // Handle status change
  const handleStatusChange = async (newStatus: string) => {
    setStatus(newStatus)
    setShowCustomStatusInput(false)
    setCustomStatus('')
    
    const value = newStatus || null
    
    // Save custom option if it was used
    if (newStatus && !STATUSES.includes(newStatus as any) && !userCustomStatuses.includes(newStatus)) {
      await saveCustomOption('status', newStatus)
    }
    
    await saveField('status', value)
  }
  
  // Handle custom category save
  const handleCustomCategorySave = async () => {
    if (!customCategory.trim()) return
    
    const finalCategory = customCategory.trim()
    setCategory(finalCategory)
    setShowCustomCategoryInput(false)
    
    // Save custom option
    await saveCustomOption('category', finalCategory)
    
    // Save to item
    await saveField('category', finalCategory)
    setCustomCategory('')
  }
  
  // Handle custom status save
  const handleCustomStatusSave = async () => {
    if (!customStatus.trim()) return
    
    const finalStatus = customStatus.trim()
    setStatus(finalStatus)
    setShowCustomStatusInput(false)
    
    // Save custom option
    await saveCustomOption('status', finalStatus)
    
    // Save to item
    await saveField('status', finalStatus)
    setCustomStatus('')
  }

  // Handle notes save on blur
  const handleNotesBlur = async () => {
    const trimmedNotes = notes.trim() || null
    if (trimmedNotes !== (item?.notes || null)) {
      await saveField('notes', trimmedNotes)
    }
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

  // Save location fields (when in edit mode)
  const handleSaveLocation = async () => {
    setSaving(true)
    setError(null)

    try {
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

      // Determine location data: use Google Place if selected, otherwise use manual entry
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

      const { error: updateError } = await supabase
        .from('saved_items')
        .update({
          description: description.trim() || null,
          ...locationData,
          category: finalCategory,
          status: finalStatus,
        })
        .eq('id', itemId)

      if (updateError) throw updateError

      setIsEditingLocation(false)
      loadItem()
    } catch (err: any) {
      setError(err.message || 'Failed to save changes')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this item?')) return

    try {
      const { error } = await supabase
        .from('saved_items')
        .delete()
        .eq('id', itemId)

      if (error) throw error

      router.push('/')
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
          <Link href="/" className="text-gray-900 font-medium hover:underline">
            ← Back to home
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="text-2xl font-bold text-gray-900">
              FiBi
            </Link>
            <Link
              href="/"
              className="text-gray-600 hover:text-gray-900 text-sm font-medium"
            >
              ← Back
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          {/* Preview area */}
          <div className="aspect-video bg-gray-100 relative overflow-hidden">
            {/* Preview priority: screenshot_url > thumbnail_url > placeholder */}
            {(() => {
              const previewImageUrl = item.screenshot_url || item.thumbnail_url || null
              const hasImage = !!previewImageUrl
              const isUserScreenshot = !!item.screenshot_url

              if (hasImage) {
                return (
                  <>
                    <img
                      src={previewImageUrl}
                      alt={title || item.title || getHostname(item.url)}
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
                      <div className="absolute top-4 left-4 px-2 py-1 bg-black/70 text-white text-xs rounded">
                        Your screenshot
                      </div>
                    )}
                    <div className="hidden w-full h-full items-center justify-center bg-gray-50">
                      <div className="text-center">
                        <div className="text-gray-400 text-5xl mb-3">
                          {item.platform === 'TikTok' ? '🎵' : item.platform === 'Instagram' ? '📷' : item.platform === 'YouTube' ? '▶️' : '🔗'}
                        </div>
                        <p className="text-sm text-gray-500 px-4">Preview unavailable</p>
                      </div>
                    </div>
                  </>
                )
              } else {
                return (
                  <div className="w-full h-full flex items-center justify-center bg-gray-50">
                    <div className="text-center">
                      <div className="text-gray-400 text-5xl mb-3">
                        {item.platform === 'TikTok' ? '🎵' : item.platform === 'Instagram' ? '📷' : item.platform === 'YouTube' ? '▶️' : '🔗'}
                      </div>
                      <p className="text-sm text-gray-500 px-4">Preview unavailable</p>
                    </div>
                  </div>
                )
              }
            })()}
            
            {/* Platform badge - top right */}
            <div className={`absolute top-4 right-4 px-3 py-1.5 rounded-lg text-sm font-medium ${
              item.platform === 'TikTok' ? 'bg-black text-white' :
              item.platform === 'Instagram' ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white' :
              item.platform === 'YouTube' ? 'bg-red-600 text-white' :
              'bg-gray-700 text-white'
            }`}>
              {item.platform}
            </div>

            {/* Screenshot management buttons */}
            <div className="absolute bottom-4 right-4 flex gap-2">
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
              {/* Title - always editable */}
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

              {/* Category and Status - always editable */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                  <div className="flex flex-wrap gap-2 mb-2 overflow-x-auto max-h-[calc(3*2.5rem+0.5rem)]" style={{ scrollbarWidth: 'thin' }}>
                    {CATEGORIES.map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => {
                          handleCategoryChange(category === cat ? '' : cat)
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
                          handleCategoryChange(category === cat ? '' : cat)
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

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                  <div className="flex flex-wrap gap-2 mb-2 overflow-x-auto max-h-[calc(3*2.5rem+0.5rem)]" style={{ scrollbarWidth: 'thin' }}>
                    {STATUSES.map((stat) => (
                      <button
                        key={stat}
                        type="button"
                        onClick={() => {
                          handleStatusChange(status === stat ? '' : stat)
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
                          handleStatusChange(status === stat ? '' : stat)
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
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={customStatus}
                        onChange={(e) => setCustomStatus(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault()
                            handleCustomStatusSave()
                          }
                        }}
                        placeholder="Enter custom status..."
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                      />
                      <button
                        type="button"
                        onClick={handleCustomStatusSave}
                        className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
                      >
                        Save
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-6">
              {/* Notes - always editable */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notes
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  onBlur={handleNotesBlur}
                  rows={4}
                  placeholder="Why did you save this?"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent resize-none"
                />
              </div>

              {/* Location fields - edit mode */}
              {isEditingLocation ? (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Description
                    </label>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      rows={4}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <GooglePlacesInput
                      value={locationSearchValue}
                      onChange={(place) => {
                        setSelectedPlace(place)
                        if (place) {
                          setLocationSearchValue(place.place_name)
                          // Clear manual inputs when place is selected
                          setLocationCity('')
                          setLocationCountry('')
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
                      }}
                      onManualCountryChange={(country) => {
                        setLocationCountry(country)
                        // Clear Google place data when manually entering
                        if (selectedPlace) {
                          setSelectedPlace(null)
                          setLocationSearchValue('')
                        }
                      }}
                      manualCity={locationCity}
                      manualCountry={locationCountry}
                      id="location-search-edit"
                    />
                    {(selectedPlace || locationCity || locationCountry) && (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedPlace(null)
                          setLocationSearchValue('')
                          setLocationCity('')
                          setLocationCountry('')
                        }}
                        className="mt-2 text-sm text-red-600 hover:text-red-800 font-medium"
                      >
                        Remove location
                      </button>
                    )}
                  </div>

                  {/* Category */}
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

                  {/* Status */}
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
                </>
              ) : (
                <>
                  {item.description && (
                    <div>
                      <h2 className="text-sm font-medium text-gray-700 mb-1">Description</h2>
                      <p className="text-gray-900">{item.description}</p>
                    </div>
                  )}

                  {(item.location_city || item.location_country || item.place_name || item.formatted_address) && (
                    <div>
                      <h2 className="text-sm font-medium text-gray-700 mb-1">Location</h2>
                      {item.place_name && (
                        <p className="text-gray-900 font-medium mb-1">{item.place_name}</p>
                      )}
                      {item.formatted_address && (
                        <p className="text-sm text-gray-600 mb-1">{item.formatted_address}</p>
                      )}
                      {(item.location_city || item.location_country) && (
                        <p className="text-gray-900">
                          {[item.location_city, item.location_country].filter(Boolean).join(', ')}
                        </p>
                      )}
                    </div>
                  )}
                </>
              )}

            </div>

            {/* Open original link button - prominent */}
            <div className="mt-8 pt-6 border-t border-gray-200">
              <a
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-gray-900 text-white px-6 py-3 rounded-lg font-medium hover:bg-gray-800 transition-colors w-full sm:w-auto justify-center"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
                Open original link
              </a>
              <p className="text-xs text-gray-500 mt-2 break-all">{item.url}</p>
            </div>

            <div className="flex gap-4 mt-6 pt-6 border-t border-gray-200">
              {isEditingLocation ? (
                <>
                  <button
                    onClick={handleSaveLocation}
                    disabled={saving}
                    className="bg-gray-900 text-white px-6 py-2 rounded-lg font-medium hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                  <button
                    onClick={() => {
                      setIsEditingLocation(false)
                      loadItem()
                    }}
                    className="px-6 py-2 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDelete}
                    className="px-6 py-2 border border-red-300 text-red-700 rounded-lg font-medium hover:bg-red-50 transition-colors ml-auto"
                  >
                    Delete
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => setIsEditingLocation(true)}
                    className="px-6 py-2 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Edit Location
                  </button>
                  <button
                    onClick={handleDelete}
                    className="px-6 py-2 border border-red-300 text-red-700 rounded-lg font-medium hover:bg-red-50 transition-colors"
                  >
                    Delete
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

