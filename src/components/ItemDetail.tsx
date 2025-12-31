'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { SavedItem, CATEGORIES, STATUSES } from '@/types/database'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { getHostname } from '@/lib/utils'

interface ItemDetailProps {
  itemId: string
}

export default function ItemDetail({ itemId }: ItemDetailProps) {
  const [item, setItem] = useState<SavedItem | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  
  // Form state
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [locationCountry, setLocationCountry] = useState('')
  const [locationCity, setLocationCity] = useState('')
  const [category, setCategory] = useState('')
  const [status, setStatus] = useState('')

  const supabase = createClient()
  const router = useRouter()

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
        setCategory(data.category || '')
        setStatus(data.status || '')
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load item')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    setError(null)

    try {
      const { error: updateError } = await supabase
        .from('saved_items')
        .update({
          title: title.trim() || null,
          description: description.trim() || null,
          location_country: locationCountry.trim() || null,
          location_city: locationCity.trim() || null,
          category: category || null,
          status: status || null,
        })
        .eq('id', itemId)

      if (updateError) throw updateError

      setIsEditing(false)
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
            {item.thumbnail_url ? (
              <>
                <img
                  src={item.thumbnail_url}
                  alt={item.title || getHostname(item.url)}
                  className="w-full h-full object-cover"
                  loading="lazy"
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    // Fallback to placeholder on error
                    const target = e.target as HTMLImageElement
                    target.style.display = 'none'
                    const placeholder = target.nextElementSibling as HTMLElement
                    if (placeholder) placeholder.style.display = 'flex'
                  }}
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
              <div className="w-full h-full flex items-center justify-center bg-gray-50">
                <div className="text-center">
                  <div className="text-gray-400 text-5xl mb-3">
                    {item.platform === 'TikTok' ? '🎵' : item.platform === 'Instagram' ? '📷' : item.platform === 'YouTube' ? '▶️' : '🔗'}
                  </div>
                  <p className="text-sm text-gray-500 px-4">Preview unavailable</p>
                </div>
              </div>
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
          </div>

          <div className="p-8">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm mb-6">
                {error}
              </div>
            )}

            <div className="flex items-start justify-between mb-6">
              <div className="flex-1">
                {isEditing ? (
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full text-2xl font-bold text-gray-900 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                    placeholder="Title"
                  />
                ) : (
                  <h1 className="text-2xl font-bold text-gray-900 mb-2">
                    {item.title || 'Untitled'}
                  </h1>
                )}
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  {item.category && (
                    <span className="text-sm bg-gray-100 text-gray-700 px-2.5 py-1 rounded-full">
                      {item.category}
                    </span>
                  )}
                  {item.status && (
                    <span className={`text-sm px-2.5 py-1 rounded-full ${
                      item.status === 'Want' ? 'bg-blue-100 text-blue-700' :
                      item.status === 'Dream' ? 'bg-purple-100 text-purple-700' :
                      item.status === 'Maybe' ? 'bg-yellow-100 text-yellow-700' :
                      item.status === 'Been' ? 'bg-green-100 text-green-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {item.status}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-6">
              {isEditing ? (
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

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Category
                      </label>
                      <select
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                      >
                        <option value="">Select...</option>
                        {CATEGORIES.map((cat) => (
                          <option key={cat} value={cat}>
                            {cat}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Status
                      </label>
                      <select
                        value={status}
                        onChange={(e) => setStatus(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                      >
                        <option value="">Select...</option>
                        {STATUSES.map((stat) => (
                          <option key={stat} value={stat}>
                            {stat}
                          </option>
                        ))}
                      </select>
                    </div>
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
              {isEditing ? (
                <>
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="bg-gray-900 text-white px-6 py-2 rounded-lg font-medium hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                  <button
                    onClick={() => {
                      setIsEditing(false)
                      loadItem()
                    }}
                    className="px-6 py-2 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => setIsEditing(true)}
                    className="bg-gray-900 text-white px-6 py-2 rounded-lg font-medium hover:bg-gray-800 transition-colors"
                  >
                    Edit
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

