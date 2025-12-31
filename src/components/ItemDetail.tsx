'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { SavedItem, CATEGORIES, STATUSES } from '@/types/database'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { getHostname, uploadScreenshot } from '@/lib/utils'

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
  const [notes, setNotes] = useState('')
  
  // Location fields (edit mode only)
  const [description, setDescription] = useState('')
  const [locationCountry, setLocationCountry] = useState('')
  const [locationCity, setLocationCity] = useState('')

  const supabase = createClient()
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    loadItem()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemId])

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
    const value = newCategory || null
    await saveField('category', value)
  }

  // Handle status change
  const handleStatusChange = async (newStatus: string) => {
    setStatus(newStatus)
    const value = newStatus || null
    await saveField('status', value)
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
      setError(err.message || 'Failed to upload screenshot')
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

      const { error: updateError } = await supabase
        .from('saved_items')
        .update({
          description: description.trim() || null,
          location_country: locationCountry.trim() || null,
          location_city: locationCity.trim() || null,
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
              <div className="flex items-center gap-3 flex-wrap">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Category</label>
                  <select
                    value={category}
                    onChange={(e) => handleCategoryChange(e.target.value)}
                    className="px-3 py-1.5 text-sm border border-gray-300 rounded-full bg-white hover:bg-gray-50 focus:ring-2 focus:ring-gray-900 focus:border-transparent transition-colors"
                  >
                    <option value="">Select category...</option>
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Status</label>
                  <select
                    value={status}
                    onChange={(e) => handleStatusChange(e.target.value)}
                    className={`px-3 py-1.5 text-sm border rounded-full bg-white hover:bg-gray-50 focus:ring-2 focus:ring-gray-900 focus:border-transparent transition-colors ${
                      status === 'Want' ? 'border-blue-300' :
                      status === 'Dream' ? 'border-purple-300' :
                      status === 'Maybe' ? 'border-yellow-300' :
                      status === 'Been' ? 'border-green-300' :
                      'border-gray-300'
                    }`}
                  >
                    <option value="">Select status...</option>
                    {STATUSES.map((stat) => (
                      <option key={stat} value={stat}>
                        {stat}
                      </option>
                    ))}
                  </select>
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

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        City
                      </label>
                      <input
                        type="text"
                        value={locationCity}
                        onChange={(e) => setLocationCity(e.target.value)}
                        placeholder="e.g. London"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Country
                      </label>
                      <input
                        type="text"
                        value={locationCountry}
                        onChange={(e) => setLocationCountry(e.target.value)}
                        placeholder="e.g. United Kingdom"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                      />
                    </div>
                  </div>

                  {/* Category */}
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

                  {/* Status */}
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
                </>
              ) : (
                <>
                  {item.description && (
                    <div>
                      <h2 className="text-sm font-medium text-gray-700 mb-1">Description</h2>
                      <p className="text-gray-900">{item.description}</p>
                    </div>
                  )}

                  {(item.location_city || item.location_country) && (
                    <div>
                      <h2 className="text-sm font-medium text-gray-700 mb-1">Location</h2>
                      <p className="text-gray-900">
                        {[item.location_city, item.location_country].filter(Boolean).join(', ')}
                      </p>
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

