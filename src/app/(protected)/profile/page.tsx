'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useAuth } from '@/lib/useAuth'
import { createClient } from '@/lib/supabase/client'

interface UserStats {
  totalPlaces: number
  plannedPlaces: number
  uniqueCountries: number
}

interface UserPreferences {
  defaultView: 'grid' | 'map' | 'calendar'
  defaultHomeFilter: 'all' | 'planned' | 'unplanned'
  units: 'km' | 'miles'
}

export default function ProfilePage() {
  const { user, loading: authLoading } = useAuth()
  const supabase = createClient()
  const [stats, setStats] = useState<UserStats>({
    totalPlaces: 0,
    plannedPlaces: 0,
    uniqueCountries: 0,
  })
  const [preferences, setPreferences] = useState<UserPreferences>({
    defaultView: 'grid',
    defaultHomeFilter: 'all',
    units: 'km',
  })
  const [displayName, setDisplayName] = useState('')
  const [savingName, setSavingName] = useState(false)
  const [email, setEmail] = useState('')
  const [isEditingEmail, setIsEditingEmail] = useState(false)
  const [updatingEmail, setUpdatingEmail] = useState(false)
  const [loading, setLoading] = useState(true)
  const [showClearConfirm, setShowClearConfirm] = useState(false)
  const [clearing, setClearing] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const modalRef = useRef<HTMLDivElement>(null)

  // Auth redirect is handled by (protected) layout

  const loadProfileData = useCallback(async () => {
    if (!user) return

    try {
      setLoading(true)
      setErrorMessage(null)

      // Optimize stats queries using COUNT instead of fetching all data
      const [totalResult, plannedResult, countriesResult] = await Promise.all([
        // Total places count
        supabase
          .from('saved_items')
          .select('id', { count: 'exact', head: true }),
        // Planned places count
        supabase
          .from('saved_items')
          .select('id', { count: 'exact', head: true })
          .not('planned_date', 'is', null),
        // Unique countries (need to fetch distinct values)
        supabase
          .from('saved_items')
          .select('location_country')
          .not('location_country', 'is', null),
      ])

      if (totalResult.error) {
        console.error('Error loading total places:', totalResult.error)
        setErrorMessage('Failed to load stats. Please refresh the page.')
      } else {
        const totalPlaces = totalResult.count || 0
        const plannedPlaces = plannedResult.count || 0
        const uniqueCountries = new Set(
          countriesResult.data?.map(item => item.location_country).filter(Boolean) || []
        ).size

        setStats({
          totalPlaces,
          plannedPlaces,
          uniqueCountries,
        })
      }

      // Load profile (display name from profiles.full_name)
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .maybeSingle()
      setDisplayName(profile?.full_name ?? '')

      setLoading(false)
    } catch (error) {
      console.error('Error loading profile data:', error)
      setErrorMessage('Failed to load profile data. Please refresh the page.')
      setLoading(false)
    }
  }, [user, supabase])

  useEffect(() => {
    if (user) {
      setEmail(user.email || '')
      loadProfileData()
    }
  }, [user, loadProfileData])

  const handleClearTestData = async () => {
    if (!user) return

    setClearing(true)
    setErrorMessage(null)
    setSuccessMessage(null)
    
    try {
      // Delete all items for this user
      const { error } = await supabase
        .from('saved_items')
        .delete()
        .eq('user_id', user.id)

      if (error) {
        console.error('Error clearing test data:', error)
        setErrorMessage('Failed to clear test data. Please try again.')
      } else {
        // Reload stats
        await loadProfileData()
        setShowClearConfirm(false)
        setSuccessMessage('All saved places have been deleted.')
        // Clear success message after 5 seconds
        setTimeout(() => setSuccessMessage(null), 5000)
      }
    } catch (error) {
      console.error('Error clearing test data:', error)
      setErrorMessage('Failed to clear test data. Please try again.')
    } finally {
      setClearing(false)
    }
  }

  // Handle escape key to close modal
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showClearConfirm) {
        setShowClearConfirm(false)
      }
    }

    if (showClearConfirm) {
      document.addEventListener('keydown', handleEscape)
      // Focus the modal when it opens
      modalRef.current?.focus()
    }

    return () => {
      document.removeEventListener('keydown', handleEscape)
    }
  }, [showClearConfirm])

  const handleUpdateEmail = async () => {
    if (!user || !email.trim()) {
      setErrorMessage('Please enter a valid email address.')
      return
    }

    if (email === user.email) {
      setIsEditingEmail(false)
      return
    }

    setUpdatingEmail(true)
    setErrorMessage(null)
    setSuccessMessage(null)

    try {
      const { error } = await supabase.auth.updateUser({ email: email.trim() })

      if (error) {
        console.error('Error updating email:', error)
        setErrorMessage(error.message || 'Failed to update email. Please try again.')
        setUpdatingEmail(false)
        return
      }

      setSuccessMessage('Email update requested. Please check your new email for a confirmation link.')
      setIsEditingEmail(false)
      setTimeout(() => setSuccessMessage(null), 5000)
    } catch (error) {
      console.error('Error updating email:', error)
      setErrorMessage('Failed to update email. Please try again.')
    } finally {
      setUpdatingEmail(false)
    }
  }

  const handleCancelEmailEdit = () => {
    setEmail(user?.email || '')
    setIsEditingEmail(false)
    setErrorMessage(null)
  }

  const handleSaveDisplayName = async () => {
    if (!user) return
    setSavingName(true)
    setErrorMessage(null)
    setSuccessMessage(null)
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ full_name: displayName.trim() || null })
        .eq('id', user.id)
      if (error) {
        console.error('Error saving display name:', error)
        setErrorMessage(error.message || 'Failed to save name. Please try again.')
        return
      }
      setSuccessMessage('Name saved.')
      setTimeout(() => setSuccessMessage(null), 3000)
    } catch (err) {
      console.error('Error saving display name:', err)
      setErrorMessage('Failed to save name. Please try again.')
    } finally {
      setSavingName(false)
    }
  }

  const getInitials = (emailOrName: string) => {
    if (!emailOrName) return '?'
    const name = emailOrName.includes('@') ? emailOrName.split('@')[0] : emailOrName.trim()
    if (!name) return '?'
    if (name.length >= 2) return name.substring(0, 2).toUpperCase()
    return name.charAt(0).toUpperCase()
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-500">
        <div>Loading your profile…</div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24 md:pb-8">
      <div className="max-w-2xl mx-auto px-4 py-4 md:py-6">
        {/* Header */}
        <header className="mb-6">
          <h1 className="text-xl md:text-2xl font-bold text-gray-900">My FiBi</h1>
          <p className="text-xs md:text-sm text-gray-500 mt-0.5">Your personal travel space</p>
        </header>

        {/* Error Message */}
        {errorMessage && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center justify-between">
            <span>{errorMessage}</span>
            <button
              onClick={() => setErrorMessage(null)}
              className="text-red-700 hover:text-red-900 ml-4"
              aria-label="Dismiss error message"
            >
              ✕
            </button>
          </div>
        )}

        {/* Success Message */}
        {successMessage && (
          <div className="mb-6 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg flex items-center justify-between">
            <span>{successMessage}</span>
            <button
              onClick={() => setSuccessMessage(null)}
              className="text-green-700 hover:text-green-900 ml-4"
              aria-label="Dismiss success message"
            >
              ✕
            </button>
          </div>
        )}

        {/* Identity Section */}
        <section className="bg-white rounded-xl p-4 md:p-6 mb-4 shadow-sm">
          <h2 className="text-base md:text-lg font-semibold text-gray-900 mb-3">Identity</h2>
          
          <div className="flex items-center gap-3 md:gap-4 mb-4">
            {/* Avatar */}
            <div className="w-12 h-12 md:w-16 md:h-16 rounded-full bg-gray-900 text-white flex items-center justify-center text-base md:text-xl font-semibold flex-shrink-0">
              {getInitials(displayName || email || user.email || '')}
            </div>
            
            <div className="flex-1">
              <div className="text-sm text-gray-500 mb-1">Email</div>
              {isEditingEmail ? (
                <div className="space-y-2">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={updatingEmail}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                    placeholder="your@email.com"
                    aria-label="Email address"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleUpdateEmail}
                      disabled={updatingEmail || !email.trim() || email === user.email}
                      className="px-4 py-1.5 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      aria-label="Save email"
                    >
                      {updatingEmail ? 'Saving...' : 'Save'}
                    </button>
                    <button
                      onClick={handleCancelEmailEdit}
                      disabled={updatingEmail}
                      className="px-4 py-1.5 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      aria-label="Cancel email edit"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div className="text-base text-gray-900">{user.email}</div>
                  <button
                    onClick={() => setIsEditingEmail(true)}
                    className="text-sm text-gray-600 hover:text-gray-900 underline"
                    aria-label="Edit email"
                  >
                    Edit
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Display Name (optional) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Display Name (optional)
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Your name"
                disabled={savingName}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Display name"
              />
              <button
                onClick={handleSaveDisplayName}
                disabled={savingName}
                className="px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                aria-label="Save display name"
              >
                {savingName ? 'Saving…' : 'Save'}
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1">Used when you share trips or comment</p>
          </div>
        </section>

        {/* Stats Section */}
        <section className="bg-white rounded-xl p-4 md:p-6 mb-4 shadow-sm">
          <h2 className="text-base md:text-lg font-semibold text-gray-900 mb-3">Stats</h2>
          
          <div className="grid grid-cols-3 gap-3 md:gap-4">
            <div className="text-center">
              <div className="text-xl md:text-2xl font-bold text-gray-900">{stats.totalPlaces}</div>
              <div className="text-xs text-gray-500 mt-0.5">Saved Places</div>
            </div>
            <div className="text-center">
              <div className="text-xl md:text-2xl font-bold text-gray-900">{stats.plannedPlaces}</div>
              <div className="text-xs text-gray-500 mt-0.5">Planned</div>
            </div>
            <div className="text-center">
              <div className="text-xl md:text-2xl font-bold text-gray-900">{stats.uniqueCountries}</div>
              <div className="text-xs text-gray-500 mt-0.5">Countries</div>
            </div>
          </div>
        </section>

        {/* Preferences Section */}
        <section className="bg-white rounded-xl p-4 md:p-6 mb-4 shadow-sm">
          <h2 className="text-base md:text-lg font-semibold text-gray-900 mb-3">Preferences</h2>
          
          <div className="space-y-4 md:space-y-6">
            {/* Default View */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Default View
              </label>
              <div className="flex gap-2">
                {(['grid', 'map', 'calendar'] as const).map((view) => (
                  <button
                    key={view}
                    onClick={() => setPreferences({ ...preferences, defaultView: view })}
                    className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      preferences.defaultView === view
                        ? 'bg-gray-900 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                    aria-label={`Set default view to ${view}`}
                    aria-pressed={preferences.defaultView === view}
                  >
                    {view.charAt(0).toUpperCase() + view.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Default Home Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Default Home Filter
              </label>
              <div className="flex gap-2">
                {(['all', 'planned', 'unplanned'] as const).map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setPreferences({ ...preferences, defaultHomeFilter: filter })}
                    className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      preferences.defaultHomeFilter === filter
                        ? 'bg-gray-900 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                    aria-label={`Set default home filter to ${filter}`}
                    aria-pressed={preferences.defaultHomeFilter === filter}
                  >
                    {filter.charAt(0).toUpperCase() + filter.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Units */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Distance Units
              </label>
              <div className="flex gap-2">
                {(['km', 'miles'] as const).map((unit) => (
                  <button
                    key={unit}
                    onClick={() => setPreferences({ ...preferences, units: unit })}
                    className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      preferences.units === unit
                        ? 'bg-gray-900 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                    aria-label={`Set distance units to ${unit === 'km' ? 'kilometers' : 'miles'}`}
                    aria-pressed={preferences.units === unit}
                  >
                    {unit === 'km' ? 'Kilometers' : 'Miles'}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Actions Section */}
        <section className="bg-white rounded-xl p-4 md:p-6 mb-4 shadow-sm">
          <h2 className="text-base md:text-lg font-semibold text-gray-900 mb-3">Actions</h2>
          
          <div className="space-y-2 md:space-y-3">
            {/* Export */}
            <button
              onClick={() => {
                // Stub for now
                setSuccessMessage('Export feature coming soon!')
                setTimeout(() => setSuccessMessage(null), 3000)
              }}
              className="w-full text-left px-4 py-3 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"
              aria-label="Export saved places"
            >
              <div className="font-medium text-gray-900">Export Saved Places</div>
              <div className="text-xs text-gray-500 mt-0.5">Download your data (coming soon)</div>
            </button>

            {/* Clear Test Data */}
            <button
              onClick={() => setShowClearConfirm(true)}
              className="w-full text-left px-4 py-3 rounded-lg border border-red-200 text-red-700 hover:bg-red-50 transition-colors"
              aria-label="Clear all test data"
            >
              <div className="font-medium">Clear Test Data</div>
              <div className="text-xs text-red-500 mt-0.5">Delete all your saved places</div>
            </button>

            {/* Log Out */}
            <a
              href="/api/auth/signout"
              className="block w-full text-left px-4 py-3 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"
              aria-label="Log out of your account"
            >
              <div className="font-medium text-gray-900">Log Out</div>
              <div className="text-xs text-gray-500 mt-0.5">Sign out of your account</div>
            </a>
          </div>
        </section>
      </div>

      {/* Clear Test Data Confirmation Modal */}
      {showClearConfirm && (
        <div 
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={(e) => {
            // Close modal when clicking backdrop
            if (e.target === e.currentTarget) {
              setShowClearConfirm(false)
            }
          }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="clear-data-title"
        >
          <div 
            ref={modalRef}
            className="bg-white rounded-2xl p-6 max-w-sm w-full"
            tabIndex={-1}
          >
            <h3 id="clear-data-title" className="text-lg font-bold text-gray-900 mb-2">
              Clear Test Data?
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              This will permanently delete all your saved places. This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowClearConfirm(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                disabled={clearing}
                aria-label="Cancel clearing test data"
              >
                Cancel
              </button>
              <button
                onClick={handleClearTestData}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors disabled:opacity-50"
                disabled={clearing}
                aria-label="Confirm and clear all test data"
              >
                {clearing ? 'Clearing...' : 'Clear All'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}

